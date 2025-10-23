"""add_provider_content_table

Revision ID: e3b0200f27ce
Revises: 0f585ca700e4
Create Date: 2025-10-05 11:30:52.764458

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e3b0200f27ce'
down_revision: str | Sequence[str] | None = '0f585ca700e4'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'provider_content',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('provider_id', sa.String(length=32), nullable=False),
        sa.Column('content_type', sa.String(length=50), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('content', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('doc_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_provider_content_provider_id'), 'provider_content', ['provider_id'], unique=False)
    op.create_index(op.f('ix_provider_content_content_type'), 'provider_content', ['content_type'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_provider_content_content_type'), table_name='provider_content')
    op.drop_index(op.f('ix_provider_content_provider_id'), table_name='provider_content')
    op.drop_table('provider_content')
