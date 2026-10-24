/*
 * This file is part of Business Front, a fork of OpenTTD.
 * OpenTTD is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 2.
 * OpenTTD is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with OpenTTD. If not, see <http://www.gnu.org/licenses/>.
 */

/**
 * @file business.cpp Business Front: monthly simulation of company-owned shops.
 *
 * Model (step 1):
 *  - potential customers = town population / 2 per month;
 *  - attractiveness      = quality * reputation * 20 / price;
 *  - market share        = attractiveness / (sum of attractiveness of all shops in the town + base resistance);
 *  - sales               = customers * share;
 *  - profit              = sales * price - sales * unit cost(quality) - monthly rent.
 */

#include "stdafx.h"
#include "business.h"
#include "company_base.h"
#include "company_func.h"
#include "command_type.h"
#include "core/backup_type.hpp"
#include "economy_func.h"
#include "error.h"
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
 * Is this object type a business run by a company?
 * @param type Object type.
 * @return true for business objects.
 */
bool IsBusinessObjectType(ObjectType type)
{
	return type == OBJECT_BURGER_SHOP;
}

/**
 * Give a freshly built business its default parameters.
 * @param o The object just built.
 */
void InitBusinessObject(Object *o)
{
	if (!IsBusinessObjectType(o->type)) return;
	o->biz_price = BIZ_DEFAULT_PRICE;
	o->biz_quality = BIZ_DEFAULT_QUALITY;
	o->biz_reputation = BIZ_DEFAULT_REPUTATION;
	o->biz_last_sales = 0;
	o->biz_last_profit = 0;
}

/**
 * Number of people in the town who might buy a burger this month.
 * @param o The shop.
 * @return Potential customers.
 */
uint32_t BusinessPotentialCustomers(const Object *o)
{
	if (o->town == nullptr) return 0;
	return o->town->cache.population / 2;
}

/**
 * How attractive this shop is: quality and reputation pull customers in, price pushes them away.
 * @param o The shop.
 * @return Attractiveness (arbitrary units, higher is better).
 */
uint32_t BusinessAttractiveness(const Object *o)
{
	uint16_t price = std::max<uint16_t>(o->biz_price, BIZ_MIN_PRICE);
	return (uint32_t)o->biz_quality * o->biz_reputation * 20 / price;
}

/**
 * Cost of making one burger at a given quality level.
 * @param quality Quality level 1..5.
 * @return Unit cost in money units (times 2, to keep integer maths).
 */
static inline uint32_t BusinessUnitCostTimesTwo(uint8_t quality)
{
	return 2 + quality; // 1.5 at quality 1 ... 3.5 at quality 5
}

/**
 * Run one month of business for one shop and credit its owner.
 * @param o The shop.
 * @param town_attractiveness Sum of attractiveness of every shop in the same town.
 */
static void BusinessRunMonth(Object *o, uint32_t town_attractiveness)
{
	uint32_t customers = BusinessPotentialCustomers(o);
	uint32_t attract = BusinessAttractiveness(o);
	uint64_t sales = (uint64_t)customers * attract / (town_attractiveness + BIZ_BASE_RESISTANCE);

	Money revenue = (Money)sales * o->biz_price;
	Money cost = (Money)sales * BusinessUnitCostTimesTwo(o->biz_quality) / 2;
	Money profit = revenue - cost - BIZ_MONTHLY_RENT;

	o->biz_last_sales = ClampTo<uint32_t>(sales);
	o->biz_last_profit = profit;

	Owner owner = GetTileOwner(o->location.tile);
	if (!Company::IsValidID(owner)) return;

	Backup<CompanyID> cur_company(_current_company, owner);
	/* A negative expense is an income. */
	SubtractMoneyFromCompany(owner, CommandCost(ExpensesType::Other, -profit));
	cur_company.Restore();
}

/** Monthly loop of all businesses. */
static const IntervalTimer<TimerGameEconomy> _economy_business_monthly({TimerGameEconomy::Trigger::Month, TimerGameEconomy::Priority::Industry}, [](auto)
{
	/* Total attractiveness per town, for the market share. */
	std::map<TownID, uint32_t> town_attract;
	for (const Object *o : Object::Iterate()) {
		if (!IsBusinessObjectType(o->type) || o->town == nullptr) continue;
		town_attract[o->town->index] += BusinessAttractiveness(o);
	}

	for (Object *o : Object::Iterate()) {
		if (!IsBusinessObjectType(o->type) || o->town == nullptr) continue;
		BusinessRunMonth(o, town_attract[o->town->index]);
	}
});

/**
 * Show a small information box about a shop (step 1 of Business Front; a real window comes later).
 * @param o The shop.
 */
void BusinessShowInfo(const Object *o)
{
	ShowErrorMessage(
		GetEncodedString(STR_BUSINESS_INFO_SUMMARY, o->town != nullptr ? o->town->index : TownID::Invalid()),
		GetEncodedString(STR_BUSINESS_INFO_DETAIL, (Money)o->biz_price, o->biz_quality, o->biz_reputation, o->biz_last_sales, o->biz_last_profit),
		WarningLevel::Info);
}
