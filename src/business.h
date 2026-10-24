/*
 * This file is part of Business Front, a fork of OpenTTD.
 * OpenTTD is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 2.
 * OpenTTD is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with OpenTTD. If not, see <http://www.gnu.org/licenses/>.
 */

/** @file business.h Business Front: companies run businesses (burger restaurants) built as industries, supplied by trucks, earning money from their town. */

#ifndef BUSINESS_H
#define BUSINESS_H

#include "industry.h"

/** Default parameters of a freshly built burger restaurant. */
static const uint16_t BIZ_DEFAULT_PRICE = 5; ///< Price of one burger.
static const uint8_t BIZ_DEFAULT_QUALITY = 3; ///< Quality level (1..5).
static const uint8_t BIZ_DEFAULT_REPUTATION = 50; ///< Reputation (0..100).

static const uint8_t BIZ_MIN_QUALITY = 1;
static const uint8_t BIZ_MAX_QUALITY = 5;
static const uint16_t BIZ_MIN_PRICE = 1;
static const uint16_t BIZ_MAX_PRICE = 20;

/** Supply chain, phase 1. */
static const uint32_t BIZ_BURGERS_PER_GRAIN = 10; ///< One unit of grain/wheat makes this many burgers (bread).
static const uint16_t BIZ_WOOD_PER_MONTH = 10; ///< Wood burnt per month to heat the restaurant.
static const Money BIZ_PURCHASE_PRICE_WOOD = 20; ///< Price of one unit of wood bought on the market when the stock is empty.
static const Money BIZ_PURCHASE_PRICE_GRAIN = 20; ///< Price of one unit of grain bought on the market when the stock is empty.

/** Land and rent: the bigger the town, the dearer the place. */
static const Money BIZ_LAND_PRICE_PER_INHABITANT = 10; ///< Added to the construction cost per inhabitant of the nearest town.
static const Money BIZ_BASE_RENT = 100; ///< Monthly rent, fixed part.
static const uint32_t BIZ_INHABITANTS_PER_RENT_UNIT = 10; ///< Monthly rent: + 1 per this many inhabitants.

bool IsBusinessIndustryType(IndustryType type);
Money BusinessConstructionCost(const IndustrySpec *spec, TileIndex tile);
Money BusinessMonthlyRent(const Industry *i);
void InitBusinessIndustry(Industry *i);
bool BusinessIsHeated(const Industry *i);
uint16_t BusinessWoodStock(const Industry *i);
uint16_t BusinessBreadStock(const Industry *i);
uint32_t BusinessPotentialCustomers(const Industry *i);
uint32_t BusinessAttractiveness(const Industry *i);
std::vector<std::string> BusinessViewLines(const Industry *i);

#endif /* BUSINESS_H */
