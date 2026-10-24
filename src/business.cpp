/*
 * This file is part of Business Front, a fork of OpenTTD.
 * OpenTTD is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 2.
 * OpenTTD is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with OpenTTD. If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @file business.cpp Business Front: monthly simulation of company-owned businesses (burger restaurants).
 *
 * A restaurant is an industry funded by a company. Trucks deliver wood (heating) and grain/wheat (bread);
 * deliveries stay in stock (Industry::accepted[].waiting, see TriggerIndustryProduction) and are consumed here.
 *
 * Model (phase 1):
 *  - potential customers = town population / 2 per month;
 *  - attractiveness      = quality * reputation * 20 / price;
 *  - market share        = attractiveness / (sum of attractiveness of all restaurants in the town + base resistance);
 *  - sales               = customers * share;
 *  - wood and grain come from the stock delivered by truck; what is missing is bought on the market, dear;
 *  - profit              = sales * price - sales * unit cost(quality) - purchases - monthly rent, credited to the founder.
 */

#include "stdafx.h"
#include "business.h"
#include "cargotype.h"
#include "company_base.h"
#include "company_func.h"
#include "command_type.h"
#include "core/backup_type.hpp"
#include "economy_func.h"
#include "strings_func.h"
#include "town.h"
#include "map_func.h"
#include "window_func.h"
#include "timer/timer.h"
#include "timer/timer_game_economy.h"

#include "table/strings.h"

#include "safeguards.h"

static const uint32_t BIZ_BASE_RESISTANCE = 300; ///< Attractiveness units of "people who do not buy any burger".

/**
 * Price of building a business here: base price of the industry plus the land, dearer in a big town.
 * @param spec The business industry.
 * @param tile Where it is built.
 * @return The construction cost.
 */
Money BusinessConstructionCost(const IndustrySpec *spec, TileIndex tile)
{
	return spec->GetConstructionCost() + BusinessLandPrice(tile);
}

/**
 * Price of the land for a business on this tile: grows with the size of the nearest town,
 * shrinks with the distance to its centre (down to a floor).
 * @param tile The tile.
 * @return The land price.
 */
Money BusinessLandPrice(TileIndex tile)
{
	if (tile == INVALID_TILE || !IsValidTile(tile)) return 0;
	const Town *t = ClosestTownFromTile(tile, UINT_MAX);
	if (t == nullptr) return 0;
	uint dist = std::min(DistanceManhattan(tile, t->xy), BIZ_LAND_PRICE_RADIUS);
	uint pct = std::max(BIZ_LAND_PRICE_FLOOR_PCT, 100 - dist * (100 - BIZ_LAND_PRICE_FLOOR_PCT) / BIZ_LAND_PRICE_RADIUS);
	return BIZ_LAND_PRICE_PER_INHABITANT * t->cache.population * pct / 100;
}

/**
 * Monthly rent of a business: fixed part plus a part growing with the town.
 * @param i The business.
 * @return The rent for one month.
 */
Money BusinessMonthlyRent(const Industry *i)
{
	uint32_t population = i->town == nullptr ? 0 : i->town->cache.population;
	return BIZ_BASE_RENT + population / BIZ_INHABITANTS_PER_RENT_UNIT;
}

/**
 * Is this industry type a business run by a company?
 * @param type Industry type.
 * @return true for business industries.
 */
bool IsBusinessIndustryType(IndustryType type)
{
	return IsRestaurantIndustryType(type) || IsWarehouseIndustryType(type);
}

/** Is this industry type a burger restaurant? */
bool IsRestaurantIndustryType(IndustryType type)
{
	return type == IT_BURGER_SHOP;
}

/** Is this industry type a central warehouse? */
bool IsWarehouseIndustryType(IndustryType type)
{
	return type == IT_WAREHOUSE_BIZ;
}

/**
 * Give a freshly built business its default parameters.
 * @param i The industry just created.
 */
void InitBusinessIndustry(Industry *i)
{
	if (!IsBusinessIndustryType(i->type)) return;
	i->biz_price = BIZ_DEFAULT_PRICE;
	i->biz_quality = BIZ_DEFAULT_QUALITY;
	i->biz_reputation = BIZ_DEFAULT_REPUTATION;
	i->biz_heated = false;
	i->biz_last_sales = 0;
	i->biz_last_profit = 0;
	i->biz_last_purchases = 0;
	i->biz_last_revenue = 0;
	i->biz_last_costs = 0;
}

/**
 * Find the stock slot of the wood, or of the bread cargo (anything accepted that is not wood).
 * @param i The restaurant.
 * @param wood true for wood, false for the bread cargo.
 * @return The accepted-cargo slot, or end() when the industry has none.
 */
static Industry::AcceptedCargoes::const_iterator BusinessStockSlot(const Industry *i, bool wood)
{
	CargoType wood_type = GetCargoTypeByLabel(CT_WOOD);
	for (auto it = std::begin(i->accepted); it != std::end(i->accepted); ++it) {
		if (!IsValidCargoType(it->cargo)) continue;
		if ((it->cargo == wood_type) == wood) return it;
	}
	return std::end(i->accepted);
}

static Industry::AcceptedCargoes::iterator BusinessStockSlot(Industry *i, bool wood)
{
	auto it = BusinessStockSlot(static_cast<const Industry *>(i), wood);
	return std::begin(i->accepted) + (it - std::cbegin(i->accepted));
}

/** @return Units of wood in stock. */
uint16_t BusinessWoodStock(const Industry *i)
{
	auto it = BusinessStockSlot(i, true);
	return it == std::end(i->accepted) ? 0 : it->waiting;
}

/** @return Units of grain/wheat in stock. */
uint16_t BusinessBreadStock(const Industry *i)
{
	auto it = BusinessStockSlot(i, false);
	return it == std::end(i->accepted) ? 0 : it->waiting;
}

/**
 * Is the restaurant heated right now (wood in stock)? Drives the smoke above the building.
 * @param i The restaurant.
 */
bool BusinessIsHeated(const Industry *i)
{
	return i != nullptr && IsRestaurantIndustryType(i->type) && BusinessWoodStock(i) > 0;
}

/**
 * Number of people in the town who might buy a burger this month.
 * @param i The restaurant.
 * @return Potential customers.
 */
uint32_t BusinessPotentialCustomers(const Industry *i)
{
	if (i->town == nullptr) return 0;
	return i->town->cache.population / 2;
}

/**
 * How attractive this restaurant is: quality and reputation pull customers in, price pushes them away.
 * @param i The restaurant.
 * @return Attractiveness (arbitrary units, higher is better).
 */
uint32_t BusinessAttractiveness(const Industry *i)
{
	uint16_t price = std::max<uint16_t>(i->biz_price, BIZ_MIN_PRICE);
	return (uint32_t)i->biz_quality * i->biz_reputation * 20 / price;
}

/**
 * Cost of making one burger at a given quality level, times two (integer maths).
 * @param quality Quality level 1..5.
 */
static inline uint32_t BusinessUnitCostTimesTwo(uint8_t quality)
{
	return 2 + quality; // 1.5 at quality 1 ... 3.5 at quality 5
}

/**
 * Run one month of business for one restaurant: consume stock, sell burgers, credit the founder.
 * @param i The restaurant.
 * @param town_attractiveness Sum of attractiveness of every restaurant in the same town.
 */
static void BusinessRunMonth(Industry *i, uint32_t town_attractiveness)
{
	Money purchases = 0;

	/* Heating: burn the wood delivered by truck; buy the missing wood on the market, dear. */
	auto wood = BusinessStockSlot(i, true);
	uint16_t wood_available = wood == std::end(i->accepted) ? 0 : wood->waiting;
	uint16_t wood_used = std::min<uint16_t>(wood_available, BIZ_WOOD_PER_MONTH);
	if (wood != std::end(i->accepted)) wood->waiting -= wood_used;
	purchases += BIZ_PURCHASE_PRICE_WOOD * (BIZ_WOOD_PER_MONTH - wood_used);
	i->biz_heated = true; // bought wood heats as well as delivered wood

	/* Demand. */
	uint32_t customers = BusinessPotentialCustomers(i);
	uint32_t attract = BusinessAttractiveness(i);
	uint64_t sales = (uint64_t)customers * attract / (town_attractiveness + BIZ_BASE_RESISTANCE);

	/* Bread: use the grain delivered by truck; buy the missing grain on the market, dear. */
	auto bread = BusinessStockSlot(i, false);
	uint32_t grain_needed = ClampTo<uint32_t>(CeilDiv(sales, BIZ_BURGERS_PER_GRAIN));
	uint16_t grain_available = bread == std::end(i->accepted) ? 0 : bread->waiting;
	uint16_t grain_used = std::min<uint32_t>(grain_available, grain_needed);
	if (bread != std::end(i->accepted)) bread->waiting -= grain_used;
	purchases += BIZ_PURCHASE_PRICE_GRAIN * (grain_needed - grain_used);

	Money revenue = (Money)sales * i->biz_price;
	Money cost = (Money)sales * BusinessUnitCostTimesTwo(i->biz_quality) / 2;
	Money costs = cost + purchases + BusinessMonthlyRent(i);
	Money profit = revenue - costs;
	i->biz_last_purchases = purchases;
	i->biz_last_revenue = revenue;
	i->biz_last_costs = costs;

	i->biz_last_sales = ClampTo<uint32_t>(sales);
	i->biz_last_profit = profit;
	SetWindowDirty(WindowClass::IndustryView, i->index);

	if (!Company::IsValidID(i->founder)) return;

	Backup<CompanyID> cur_company(_current_company, i->founder);
	/* A negative expense is an income. */
	SubtractMoneyFromCompany(i->founder, CommandCost(ExpensesType::BusinessRevenue, -profit));
	cur_company.Restore();
}

/**
 * Run one month of a central warehouse: everything delivered by truck plus a market purchase (cheaper than
 * what a restaurant pays) is handed out to the trucks, as produced cargo. The purchase follows what was
 * actually picked up last month, so nothing is bought for nothing.
 * @param i The warehouse.
 */
static void WarehouseRunMonth(Industry *i)
{
	Money purchases = 0;
	CargoType wood_type = GetCargoTypeByLabel(CT_WOOD);

	for (auto &a : i->accepted) {
		if (!IsValidCargoType(a.cargo)) continue;
		auto p = i->GetCargoProduced(a.cargo);
		if (p == std::end(i->produced)) continue;

		/* Deliveries go straight to the loading bay. */
		uint32_t out = a.waiting;
		a.waiting = 0;

		/* Market purchase: at least the minimum, otherwise what the trucks took away last month. */
		uint32_t bought = Clamp<uint32_t>(p->history[LAST_MONTH].transported, BIZ_WAREHOUSE_MIN_PURCHASE, BIZ_WAREHOUSE_MAX_PURCHASE);
		purchases += (a.cargo == wood_type ? BIZ_WAREHOUSE_PRICE_WOOD : BIZ_WAREHOUSE_PRICE_GRAIN) * bought;
		out += bought;

		p->waiting = ClampTo<uint16_t>(p->waiting + out);
	}

	i->biz_last_purchases = purchases;
	i->biz_last_revenue = 0;
	i->biz_last_costs = purchases + BusinessMonthlyRent(i);
	i->biz_last_profit = -i->biz_last_costs;
	SetWindowDirty(WindowClass::IndustryView, i->index);

	if (!Company::IsValidID(i->founder)) return;
	Backup<CompanyID> cur_company(_current_company, i->founder);
	SubtractMoneyFromCompany(i->founder, CommandCost(ExpensesType::BusinessRevenue, i->biz_last_costs));
	cur_company.Restore();
}

/** Monthly loop of all businesses. */
static const IntervalTimer<TimerGameEconomy> _economy_business_monthly({TimerGameEconomy::Trigger::Month, TimerGameEconomy::Priority::Industry}, [](auto)
{
	/* Total attractiveness per town, for the market share. */
	std::map<TownID, uint32_t> town_attract;
	for (const Industry *i : Industry::Iterate()) {
		if (!IsRestaurantIndustryType(i->type) || i->town == nullptr) continue;
		town_attract[i->town->index] += BusinessAttractiveness(i);
	}

	for (Industry *i : Industry::Iterate()) {
		if (IsWarehouseIndustryType(i->type)) {
			WarehouseRunMonth(i);
		} else if (IsRestaurantIndustryType(i->type) && i->town != nullptr) {
			BusinessRunMonth(i, town_attract[i->town->index]);
		}
	}
});

/**
 * Lines shown in the industry window of a restaurant.
 * @param i The restaurant.
 * @return Formatted lines, top to bottom.
 */
std::vector<std::string> BusinessViewLines(const Industry *i)
{
	std::vector<std::string> lines;
	if (!IsBusinessIndustryType(i->type)) return lines;

	for (const auto &a : i->accepted) {
		if (!IsValidCargoType(a.cargo)) continue;
		lines.push_back(GetString(STR_BUSINESS_VIEW_STOCK, a.cargo, a.waiting));
	}

	if (IsWarehouseIndustryType(i->type)) {
		lines.push_back(GetString(STR_BUSINESS_VIEW_WAREHOUSE_HOWTO));
		lines.push_back(GetString(STR_BUSINESS_VIEW_WAREHOUSE_PURCHASES, i->biz_last_purchases));
		lines.push_back(GetString(STR_BUSINESS_VIEW_COSTS_PLAIN, i->biz_last_costs));
		return lines;
	}

	lines.push_back(GetString(BusinessIsHeated(i) ? STR_BUSINESS_VIEW_HEATED : STR_BUSINESS_VIEW_COLD));
	lines.push_back(GetString(STR_BUSINESS_VIEW_BREAD, (uint64_t)BusinessBreadStock(i) * BIZ_BURGERS_PER_GRAIN));
	lines.push_back(GetString(STR_BUSINESS_VIEW_PURCHASES, i->biz_last_purchases));
	lines.push_back(GetString(STR_BUSINESS_VIEW_OFFER, (Money)i->biz_price, i->biz_quality, i->biz_reputation));
	lines.push_back(GetString(STR_BUSINESS_VIEW_LAST_MONTH, i->biz_last_sales));
	lines.push_back(GetString(STR_BUSINESS_VIEW_REVENUE, i->biz_last_revenue));
	lines.push_back(GetString(STR_BUSINESS_VIEW_COSTS, i->biz_last_costs));
	int64_t margin = i->biz_last_revenue > 0 ? (int64_t)(i->biz_last_profit * 100 / i->biz_last_revenue) : (int64_t)0;
	lines.push_back(GetString(STR_BUSINESS_VIEW_PROFIT, i->biz_last_profit, margin));
	return lines;
}
