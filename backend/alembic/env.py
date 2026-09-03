import os
import sys
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.core.config import settings
from app.models import Base

# Alembic Config object
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set database URL from settings
config.set_main_option("sqlalchemy.url", settings.SYNC_DATABASE_URL)

target_metadata = Base.metadata

POSTGIS_SYSTEM_TABLES = {
    "spatial_ref_sys", "topology", "layer", "geom_cols",
    "addr", "addrfeat", "bg", "county", "county_lookup",
    "countysub_lookup", "cousub", "direction_lookup", "edges",
    "faces", "featnames", "geocode_settings", "geocode_settings_default",
    "loader_lookuptables", "loader_platform", "loader_variables",
    "pagc_gaz", "pagc_lex", "pagc_rules", "place", "place_lookup",
    "secondary_unit_lookup", "state", "state_lookup", "street_type_lookup",
    "tabblock", "tabblock20", "tract", "zcta5", "zip_lookup",
    "zip_lookup_all", "zip_lookup_base"
}


def include_object(object, name, type_, reflected, compare_to):
    if reflected and name in POSTGIS_SYSTEM_TABLES:
        return False
    if reflected and hasattr(object, "schema") and object.schema and object.schema != "public":
        return False
    return True


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_object=include_object,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_object=include_object,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
