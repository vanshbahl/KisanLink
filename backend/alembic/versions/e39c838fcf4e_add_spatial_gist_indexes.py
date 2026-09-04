"""add_spatial_gist_indexes

Revision ID: e39c838fcf4e
Revises: 800cb9f75154
Create Date: 2026-09-02 23:34:27.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import geoalchemy2


# revision identifiers, used by Alembic.
revision: str = 'e39c838fcf4e'
down_revision: Union[str, Sequence[str], None] = '800cb9f75154'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("CREATE INDEX IF NOT EXISTS idx_buyer_profiles_delivery_location ON buyer_profiles USING GIST (delivery_location);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_farmer_profiles_location ON farmer_profiles USING GIST (location);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_logistics_profiles_base_location ON logistics_profiles USING GIST (base_location);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_buyer_requirements_delivery_location ON buyer_requirements USING GIST (delivery_location);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_crop_listings_location ON crop_listings USING GIST (location);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_dynamic_clusters_cluster_centroid ON dynamic_clusters USING GIST (cluster_centroid);")
    op.execute("CREATE INDEX IF NOT EXISTS idx_route_waypoints_location ON route_waypoints USING GIST (location);")


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP INDEX IF EXISTS idx_buyer_profiles_delivery_location;")
    op.execute("DROP INDEX IF EXISTS idx_farmer_profiles_location;")
    op.execute("DROP INDEX IF EXISTS idx_logistics_profiles_base_location;")
    op.execute("DROP INDEX IF EXISTS idx_buyer_requirements_delivery_location;")
    op.execute("DROP INDEX IF EXISTS idx_crop_listings_location;")
    op.execute("DROP INDEX IF EXISTS idx_dynamic_clusters_cluster_centroid;")
    op.execute("DROP INDEX IF EXISTS idx_route_waypoints_location;")
