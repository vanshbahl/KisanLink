"""add reusable produce inspection evidence

Revision ID: 6d4b0a7e9c21
Revises: e39c838fcf4e
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "6d4b0a7e9c21"
down_revision: Union[str, Sequence[str], None] = "e39c838fcf4e"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "produce_inspections",
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("crop_listing_id", sa.UUID(), nullable=True),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.Column("checkpoint", sa.String(length=32), nullable=False),
        sa.Column("image_url", sa.Text(), nullable=False),
        sa.Column("analysis_status", sa.String(length=24), nullable=False),
        sa.Column("predicted_class", sa.String(length=24), nullable=True),
        sa.Column("local_model_confidence", sa.Numeric(6, 5), nullable=True),
        sa.Column("model_name", sa.String(length=64), nullable=True),
        sa.Column("provider", sa.String(length=32), nullable=False),
        sa.Column("provider_output", sa.JSON(), nullable=True),
        sa.Column("error_code", sa.String(length=64), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "checkpoint IN ('FARMER_GATE', 'LOGISTICS_PICKUP', "
            "'LOGISTICS_DROPOFF', 'WAREHOUSE_ENTRY', 'WAREHOUSE_EXIT')",
            name="ck_produce_inspections_checkpoint",
        ),
        sa.CheckConstraint(
            "analysis_status IN ('COMPLETED', 'FAILED')",
            name="ck_produce_inspections_analysis_status",
        ),
        sa.CheckConstraint(
            "predicted_class IS NULL OR predicted_class IN ('fresh', 'not_fresh')",
            name="ck_produce_inspections_predicted_class",
        ),
        sa.CheckConstraint(
            "local_model_confidence IS NULL OR "
            "(local_model_confidence >= 0 AND local_model_confidence <= 1)",
            name="ck_produce_inspections_model_confidence",
        ),
        sa.ForeignKeyConstraint(
            ["crop_listing_id"], ["crop_listings.id"], ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_produce_inspections_listing",
        "produce_inspections",
        ["crop_listing_id"],
        unique=False,
    )
    op.create_index(
        "ix_produce_inspections_checkpoint_created",
        "produce_inspections",
        ["checkpoint", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_produce_inspections_checkpoint_created",
        table_name="produce_inspections",
    )
    op.drop_index("ix_produce_inspections_listing", table_name="produce_inspections")
    op.drop_table("produce_inspections")
