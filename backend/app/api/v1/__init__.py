from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.users import router as users_router
from app.api.v1.farmers import router as farmers_router
from app.api.v1.buyers import router as buyers_router
from app.api.v1.listings import router as listings_router
from app.api.v1.requirements import router as requirements_router
from app.api.v1.matches import router as matches_router
from app.api.v1.clusters import router as clusters_router
from app.api.v1.orders import router as orders_router
from app.api.v1.payments import router as payments_router
from app.api.v1.rescue import router as rescue_router
from app.api.v1.logistics import router as logistics_v1_router
from app.api.v1.intelligence import router as intelligence_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.disputes import router as disputes_router
from app.api.v1.audit import router as audit_router

api_v1_router = APIRouter(prefix="/api/v1")

api_v1_router.include_router(auth_router)
api_v1_router.include_router(users_router)
api_v1_router.include_router(farmers_router)
api_v1_router.include_router(buyers_router)
api_v1_router.include_router(listings_router)
api_v1_router.include_router(requirements_router)
api_v1_router.include_router(matches_router)
api_v1_router.include_router(clusters_router)
api_v1_router.include_router(orders_router)
api_v1_router.include_router(payments_router)
api_v1_router.include_router(rescue_router)
api_v1_router.include_router(logistics_v1_router, prefix="/logistics", tags=["Logistics"])
api_v1_router.include_router(intelligence_router, prefix="/intelligence", tags=["Intelligence"])
api_v1_router.include_router(reviews_router, prefix="/reviews", tags=["Reviews"])
api_v1_router.include_router(disputes_router, prefix="/disputes", tags=["Disputes"])
api_v1_router.include_router(audit_router, prefix="/audit", tags=["Audit"])
