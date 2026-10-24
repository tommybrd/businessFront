/*
 * This file is part of Business Front, a fork of OpenTTD.
 * OpenTTD is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation, version 2.
 * OpenTTD is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details. You should have received a copy of the GNU General Public License along with OpenTTD. If not, see <http://www.gnu.org/licenses/>.
 */

/** @file business.h Business Front: companies run shops (burger restaurants) that earn money from the towns they are built in. */

#ifndef BUSINESS_H
#define BUSINESS_H

#include "object_base.h"

/** Default parameters of a freshly built burger shop. */
static const uint16_t BIZ_DEFAULT_PRICE = 5; ///< Price of one burger.
static const uint8_t BIZ_DEFAULT_QUALITY = 3; ///< Quality level (1..5).
static const uint8_t BIZ_DEFAULT_REPUTATION = 50; ///< Reputation (0..100).

static const uint8_t BIZ_MIN_QUALITY = 1;
static const uint8_t BIZ_MAX_QUALITY = 5;
static const uint16_t BIZ_MIN_PRICE = 1;
static const uint16_t BIZ_MAX_PRICE = 20;

bool IsBusinessObjectType(ObjectType type);
void InitBusinessObject(Object *o);
uint32_t BusinessPotentialCustomers(const Object *o);
uint32_t BusinessAttractiveness(const Object *o);
void BusinessShowInfo(const Object *o);

#endif /* BUSINESS_H */
