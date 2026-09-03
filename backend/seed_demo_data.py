import asyncio
from datetime import date, datetime, timedelta
import sys
import os

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select, func
from geoalchemy2.elements import WKTElement

from app.database import AsyncSessionLocal, engine
from app.models import (
    User, UserRoleEnum, FarmerProfile, BuyerProfile, LogisticsProfile,
    CropType, CropListing, QualityGradeEnum, ListingStatusEnum,
    PriceObservation, DemandForecast, ImpactMetric
)


async def seed_data():
    async with AsyncSessionLocal() as session:
        print("Starting seed script for Delhi NCR - Haryana Agricultural Corridor...")

        # 1. Seed Crop Types
        crop_defs = [
            {"name_en": "Tomato", "name_hi": "टमाटर", "category": "VEGETABLE", "shelf_life_days": 7},
            {"name_en": "Cauliflower", "name_hi": "फूलगोभी", "category": "VEGETABLE", "shelf_life_days": 5},
            {"name_en": "Onion", "name_hi": "प्याज", "category": "STAPLE", "shelf_life_days": 30},
            {"name_en": "Potato", "name_hi": "आलू", "category": "STAPLE", "shelf_life_days": 45},
        ]
        
        crop_types_map = {}
        for cdef in crop_defs:
            stmt = select(CropType).where(CropType.name_en == cdef["name_en"])
            res = await session.execute(stmt)
            ctype = res.scalar_one_or_none()
            if not ctype:
                ctype = CropType(
                    name_en=cdef["name_en"],
                    name_hi=cdef["name_hi"],
                    category=cdef["category"],
                    shelf_life_days=cdef["shelf_life_days"],
                    standard_mandi_unit="kg"
                )
                session.add(ctype)
                await session.flush()
            crop_types_map[cdef["name_en"]] = ctype

        # 2. Seed Farmers
        farmer_defs = [
            {
                "phone": "+919876543210",
                "name": "Ramesh Sharma",
                "village": "Murthal",
                "district": "Sonipat",
                "state": "Haryana",
                "lon": 77.0125,
                "lat": 28.9912,
                "upi": "ramesh@upi",
                "score": 4.90,
                "listing": {"qty": 1200.0, "price": 25.00, "days": 3}
            },
            {
                "phone": "+919812345671",
                "name": "Suresh Kumar",
                "village": "Rai",
                "district": "Sonipat",
                "state": "Haryana",
                "lon": 77.0500,
                "lat": 29.0200,
                "upi": "suresh@upi",
                "score": 4.80,
                "listing": {"qty": 800.0, "price": 25.00, "days": 3}
            },
            {
                "phone": "+919812345672",
                "name": "Balbir Singh",
                "village": "Samalkha",
                "district": "Panipat",
                "state": "Haryana",
                "lon": 76.9600,
                "lat": 29.3900,
                "upi": "balbir@upi",
                "score": 5.00,
                "listing": {"qty": 1700.0, "price": 24.50, "days": 4}
            },
            {
                "phone": "+919812345673",
                "name": "Jaipal Malik",
                "village": "Gharaunda",
                "district": "Panipat",
                "state": "Haryana",
                "lon": 77.0200,
                "lat": 29.3500,
                "upi": "jaipal@upi",
                "score": 4.70,
                "listing": {"qty": 1300.0, "price": 25.50, "days": 3}
            },
        ]

        tomato_crop = crop_types_map["Tomato"]

        for fdef in farmer_defs:
            stmt = select(User).where(User.phone == fdef["phone"])
            res = await session.execute(stmt)
            user = res.scalar_one_or_none()
            if not user:
                user = User(
                    phone=fdef["phone"],
                    role=UserRoleEnum.FARMER,
                    preferred_language="hi",
                    is_verified=True,
                    is_active=True
                )
                session.add(user)
                await session.flush()

                fprofile = FarmerProfile(
                    user_id=user.id,
                    full_name=fdef["name"],
                    village=fdef["village"],
                    district=fdef["district"],
                    state=fdef["state"],
                    location=WKTElement(f"POINT({fdef['lon']} {fdef['lat']})", srid=4326),
                    payout_upi_id=fdef["upi"],
                    reputation_score=fdef["score"]
                )
                session.add(fprofile)
                await session.flush()

                # Add pre-harvest Tomato listing
                harvest_dt = date.today() + timedelta(days=fdef["listing"]["days"])
                listing = CropListing(
                    farmer_id=fprofile.id,
                    crop_type_id=tomato_crop.id,
                    variety="Desi",
                    quantity_kg=fdef["listing"]["qty"],
                    available_quantity_kg=fdef["listing"]["qty"],
                    expected_price_per_kg=fdef["listing"]["price"],
                    quality_grade=QualityGradeEnum.GRADE_A,
                    is_pre_harvest=True,
                    harvest_date=harvest_dt,
                    status=ListingStatusEnum.ACTIVE,
                    location=WKTElement(f"POINT({fdef['lon']} {fdef['lat']})", srid=4326),
                    photos=["/assets/produce/tomato.webp"]
                )
                session.add(listing)

        # 3. Seed Buyer
        buyer_phone = "+919899001122"
        stmt = select(User).where(User.phone == buyer_phone)
        res = await session.execute(stmt)
        buyer_user = res.scalar_one_or_none()
        if not buyer_user:
            buyer_user = User(
                phone=buyer_phone,
                role=UserRoleEnum.BUYER,
                preferred_language="en",
                is_verified=True,
                is_active=True
            )
            session.add(buyer_user)
            await session.flush()

            bprofile = BuyerProfile(
                user_id=buyer_user.id,
                business_name="The Imperial Hotel",
                buyer_type="HOTEL",
                gstin="07AAAAA0000A1Z5",
                delivery_address="Janpath, Connaught Place, New Delhi",
                delivery_location=WKTElement("POINT(77.2167 28.6315)", srid=4326)
            )
            session.add(bprofile)

        # 4. Seed Transporter
        transporter_phone = "+919811122233"
        stmt = select(User).where(User.phone == transporter_phone)
        res = await session.execute(stmt)
        trans_user = res.scalar_one_or_none()
        if not trans_user:
            trans_user = User(
                phone=transporter_phone,
                role=UserRoleEnum.LOGISTICS_PROVIDER,
                preferred_language="en",
                is_verified=True,
                is_active=True
            )
            session.add(trans_user)
            await session.flush()

            lprofile = LogisticsProfile(
                user_id=trans_user.id,
                transporter_name="KisanExpress Freight",
                vehicle_registration_number="HR 10 AK 4821",
                vehicle_type="5.0T_EICHER",
                capacity_kg=5000.00,
                base_location=WKTElement("POINT(77.0700 29.0300)", srid=4326),
                is_available=True
            )
            session.add(lprofile)

        # 5. Seed Price Observation
        stmt = select(PriceObservation).where(PriceObservation.district == "Sonipat")
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            pobs = PriceObservation(
                crop_type_id=tomato_crop.id,
                district="Sonipat",
                modal_price_per_kg=19.00,
                min_price_per_kg=16.00,
                max_price_per_kg=22.00,
                arrival_tonnes=45.0,
                observation_date=date.today(),
                source="APMC_AGMARKNET"
            )
            session.add(pobs)

        # 6. Seed Demand Forecast
        stmt = select(DemandForecast).where(DemandForecast.region == "Delhi NCR")
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            dcast = DemandForecast(
                crop_type_id=tomato_crop.id,
                region="Delhi NCR",
                forecast_status="HIGH_DEMAND",
                projected_demand_index=1.35,
                projected_deficit_tonnes=40.0,
                forecast_period_start=date.today(),
                forecast_period_end=date.today() + timedelta(days=21)
            )
            session.add(dcast)

        # 7. Seed Impact Metric
        stmt = select(ImpactMetric).where(ImpactMetric.period_date == date.today())
        res = await session.execute(stmt)
        if not res.scalar_one_or_none():
            im = ImpactMetric(
                period_date=date.today(),
                farmer_net_gain_percentage=32.40,
                buyer_savings_percentage=18.10,
                total_distance_saved_km=68.00,
                wastage_prevented_kg=600.00
            )
            session.add(im)

        await session.commit()
        print("Seed data successfully committed for Delhi NCR - Haryana Corridor!")


if __name__ == "__main__":
    asyncio.run(seed_data())
