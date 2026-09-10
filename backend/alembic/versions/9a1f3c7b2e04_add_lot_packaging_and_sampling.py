"""add lot packaging fields and randomized sample assignments

Revision ID: 9a1f3c7b2e04
Revises: 6d4b0a7e9c21
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "9a1f3c7b2e04"
down_revision: Union[str, Sequence[str], None] = "6d4b0a7e9c21"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- crop_listings: bulk-lot packaging declaration ---
    op.add_column("crop_listings", sa.Column("lot_code", sa.String(length=32), nullable=True))
    op.add_column("crop_listings", sa.Column("packaging_type", sa.String(length=16), nullable=True))
    op.add_column("crop_listings", sa.Column("container_count", sa.Integer(), nullable=True))
    op.add_column("crop_listings", sa.Column("unit_weight_kg", sa.Numeric(8, 2), nullable=True))
    op.create_unique_constraint("uq_crop_listings_lot_code", "crop_listings", ["lot_code"])
    op.create_check_constraint(
        "ck_crop_listings_packaging_type",
        "crop_listings",
        "packaging_type IS NULL OR packaging_type IN ('CRATE', 'SACK', 'BASKET', 'LOOSE')",
    )
    op.create_check_constraint(
        "ck_crop_listings_container_count",
        "crop_listings",
        "container_count IS NULL OR container_count > 0",
    )

    # --- inspection_sample_assignments: persisted, server-generated random draw ---
    op.create_table(
        "inspection_sample_assignments",
        sa.Column(
            "id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False
        ),
        sa.Column("crop_listing_id", sa.UUID(), nullable=False),
        sa.Column("checkpoint", sa.String(length=32), nullable=False),
        sa.Column("container_count", sa.Integer(), nullable=False),
        sa.Column("sample_size", sa.Integer(), nullable=False),
        sa.Column("selected_containers", sa.JSON(), nullable=False),
        sa.Column("instructions", sa.JSON(), nullable=False),
        sa.Column("method", sa.String(length=32), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "checkpoint IN ('FARMER_GATE', 'LOGISTICS_PICKUP', "
            "'LOGISTICS_DROPOFF', 'WAREHOUSE_ENTRY', 'WAREHOUSE_EXIT')",
            name="ck_sample_assignments_checkpoint",
        ),
        sa.CheckConstraint("container_count > 0", name="ck_sample_assignments_container_count"),
        sa.CheckConstraint(
            "sample_size > 0 AND sample_size <= container_count",
            name="ck_sample_assignments_sample_size",
        ),
        sa.ForeignKeyConstraint(["crop_listing_id"], ["crop_listings.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "crop_listing_id", "checkpoint", name="uq_sample_assignment_listing_checkpoint"
        ),
    )
    op.create_index(
        "ix_sample_assignments_listing",
        "inspection_sample_assignments",
        ["crop_listing_id"],
        unique=False,
    )

    # --- produce_inspections: link a capture to its sample assignment + container ---
    op.add_column("produce_inspections", sa.Column("sample_assignment_id", sa.UUID(), nullable=True))
    op.add_column("produce_inspections", sa.Column("container_number", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_produce_inspections_sample_assignment",
        "produce_inspections",
        "inspection_sample_assignments",
        ["sample_assignment_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_produce_inspections_sample_assignment",
        "produce_inspections",
        ["sample_assignment_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_produce_inspections_sample_assignment", table_name="produce_inspections"
    )
    op.drop_constraint(
        "fk_produce_inspections_sample_assignment", "produce_inspections", type_="foreignkey"
    )
    op.drop_column("produce_inspections", "container_number")
    op.drop_column("produce_inspections", "sample_assignment_id")

    op.drop_index("ix_sample_assignments_listing", table_name="inspection_sample_assignments")
    op.drop_table("inspection_sample_assignments")

    op.drop_constraint("ck_crop_listings_container_count", "crop_listings", type_="check")
    op.drop_constraint("ck_crop_listings_packaging_type", "crop_listings", type_="check")
    op.drop_constraint("uq_crop_listings_lot_code", "crop_listings", type_="unique")
    op.drop_column("crop_listings", "unit_weight_kg")
    op.drop_column("crop_listings", "container_count")
    op.drop_column("crop_listings", "packaging_type")
    op.drop_column("crop_listings", "lot_code")
