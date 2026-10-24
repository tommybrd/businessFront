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
 *  - attractiveness      = quality * reputation * 20 / price, halved when there is no wood to heat the place;
 *  - market share        = attractiveness / (sum of attractiveness of all restaurants in the town + base resistance);
 *  - sales               = min(customers * share, bread available = grain in stock * BIZ_BURGERS_PER_GRAIN);
 *  - profit              = sales * price - sales * unit cost(quality) - monthly rent, credited to the founder.
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
#include "window_func.h"
#include "timer/timer.h"
#include "timer/timer_game_economy.h"

#include "table/strings.h"

#include "safeguards.h"

static const uint32_t BIZ_BASE_RESISTANCE = 300; ///< Attractiveness units of "people who do not buy any burger".
static const Money BIZ_MONTHLY_RENT = 200; ///< Fixed cost per month.

/**
 * Is this industry type a business run by a company?
 * @param type Industry type.
 * @return true for business industries.
 */
bool IsBusinessIndustryType(IndustryType type)
{
	return type == IT_BURGER_SHOP;
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
	return i != nullptr && IsBusinessIndustryType(i->type) && BusinessWoodStock(i) > 0;
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
 * How attractive this restaurant is: quality and reputation pull customers in, price pushes them away,
 * a cold restaurant loses half of them.
 * @param i The restaurant.
 * @return Attractiveness (arbitrary units, higher is better).
 */
uint32_t BusinessAttractiveness(const Industry *i)
{
	uint16_t price = std::max<uint16_t>(i->biz_price, BIZ_MIN_PRICE);
	uint32_t attract = (uint32_t)i->biz_quality * i->biz_reputation * 20 / price;
	if (!BusinessIsHeated(i)) attract /= 2;
	return attract;
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
	/* Heating: burn wood if there is any. */
	auto wood = BusinessStockSlot(i, true);
	i->biz_heated = wood != std::end(i->accepted) && wood->waiting > 0;
	if (i->biz_heated) wood->waiting -= std::min<uint16_t>(wood->waiting, BIZ_WOOD_PER_MONTH);

	/* Demand. */
	uint32_t customers = BusinessPotentialCustomers(i);
	uint32_t attract = BusinessAttractiveness(i);
	uint64_t sales = (uint64_t)customers * attract / (town_attractiveness + BIZ_BASE_RESISTANCE);

	/* Bread: no grain, no burger. */
	auto bread = BusinessStockSlot(i, false);
	uint64_t bread_capacity = bread == std::end(i->accepted) ? 0 : (uint64_t)bread->waiting * BIZ_BURGERS_PER_GRAIN;
	sales = std::min(sales, bread_capacity);
	if (bread != std::end(i->accepted)) bread->waiting -= ClampTo<uint16_t>(CeilDiv(sales, BIZ_BURGERS_PER_GRAIN));

	Money revenue = (Money)sales * i->biz_price;
	Money cost = (Money)sales * BusinessUnitCostTimesTwo(i->biz_quality) / 2;
	Money profit = revenue - cost - BIZ_MONTHLY_RENT;

	i->biz_last_sales = ClampTo<uint32_t>(sales);
	i->biz_last_profit = profit;
	SetWindowDirty(WindowClass::IndustryView, i->index);

	if (!Company::IsValidID(i->founder)) return;

	Backup<CompanyID> cur_company(_current_company, i->founder);
	/* A negative expense is an income. */
	SubtractMoneyFromCompany(i->founder, CommandCost(ExpensesType::BusinessRevenue, -profit));
	cur_company.Restore();
}

/** Monthly loop of all businesses. */
static const IntervalTimer<TimerGameEconomy> _economy_business_monthly({TimerGameEconomy::Trigger::Month, TimerGameEconomy::Priority::Industry}, [](auto)
{
	/* Total attractiveness per town, for the market share. */
	std::map<TownID, uint32_t> town_attract;
	for (const Industry *i : Industry::Iterate()) {
		if (!IsBusinessIndustryType(i->type) || i->town == nullptr) continue;
		town_attract[i->town->index] += BusinessAttractiveness(i);
	}

	for (Industry *i : Industry::Iterate()) {
		if (!IsBusinessIndustryType(i->type) || i->town == nullptr) continue;
		BusinessRunMonth(i, town_attract[i->town->index]);
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
	lines.push_back(GetString(BusinessIsHeated(i) ? STR_BUSINESS_VIEW_HEATED : STR_BUSINESS_VIEW_COLD));
	lines.push_back(GetString(STR_BUSINESS_VIEW_BREAD, (uint64_t)BusinessBreadStock(i) * BIZ_BURGERS_PER_GRAIN));
	lines.push_back(GetString(STR_BUSINESS_VIEW_OFFER, (Money)i->biz_price, i->biz_quality, i->biz_reputation));
	lines.push_back(GetString(STR_BUSINESS_VIEW_LAST_MONTH, i->biz_last_sales, i->biz_last_profit));
	return lines;
}
