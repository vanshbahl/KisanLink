from typing import AsyncGenerator
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.security import create_access_token
from app.main import app
from app.api.deps import get_db
from app.models import User, CropListing


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    test_engine = create_async_engine(settings.DATABASE_URL, poolclass=NullPool)
    TestSessionLocal = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)
    
    async with TestSessionLocal() as session:
        stmt = update(CropListing).values(available_quantity_kg=CropListing.quantity_kg)
        await session.execute(stmt)
        await session.commit()
        yield session
    await test_engine.dispose()


@pytest.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def _override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = _override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.fixture
async def farmer_token(db_session: AsyncSession) -> str:
    stmt = select(User).where(User.phone == "+919876543210")
    res = await db_session.execute(stmt)
    farmer_user = res.scalar_one_or_none()
    assert farmer_user is not None
    return create_access_token(subject=str(farmer_user.id), role=farmer_user.role.value)


@pytest.fixture
async def second_farmer_token(db_session: AsyncSession) -> str:
    stmt = select(User).where(User.phone == "+919812345671")
    res = await db_session.execute(stmt)
    farmer2 = res.scalar_one_or_none()
    assert farmer2 is not None
    return create_access_token(subject=str(farmer2.id), role=farmer2.role.value)


@pytest.fixture
async def buyer_token(db_session: AsyncSession) -> str:
    stmt = select(User).where(User.phone == "+919899001122")
    res = await db_session.execute(stmt)
    buyer_user = res.scalar_one_or_none()
    assert buyer_user is not None
    return create_access_token(subject=str(buyer_user.id), role=buyer_user.role.value)
