"""extend_model_configs_with_openrouter_metadata

Revision ID: 0f585ca700e4
Revises: 89340b64217a
Create Date: 2025-10-05 10:07:34.288049

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '0f585ca700e4'
down_revision: str | Sequence[str] | None = '89340b64217a'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Extend model_configs with comprehensive OpenRouter model metadata."""
    # Drop the ambiguous max_tokens column (was unclear if input or output)
    op.drop_column('model_configs', 'max_tokens')

    # Add all OpenRouter API fields
    op.add_column('model_configs', sa.Column('canonical_slug', sa.String(length=255), nullable=True))
    op.add_column('model_configs', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('model_configs', sa.Column('model_created', sa.Integer(), nullable=True, comment='Unix timestamp from OpenRouter'))
    op.add_column('model_configs', sa.Column('architecture', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Model architecture: modality, tokenizer, etc.'))
    op.add_column('model_configs', sa.Column('top_provider_context_length', sa.Integer(), nullable=True, comment='Context length from top_provider'))
    op.add_column('model_configs', sa.Column('max_completion_tokens', sa.Integer(), nullable=True, comment='Max output tokens from top_provider'))
    op.add_column('model_configs', sa.Column('is_moderated', sa.Boolean(), nullable=True, comment='Content moderation flag'))
    op.add_column('model_configs', sa.Column('per_request_limits', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Rate limiting information'))
    op.add_column('model_configs', sa.Column('supported_parameters', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Array of supported parameter names'))
    op.add_column('model_configs', sa.Column('raw', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Full OpenRouter API response'))

    # Add index on canonical_slug for faster lookups
    op.create_index(op.f('ix_model_configs_canonical_slug'), 'model_configs', ['canonical_slug'], unique=False)


def downgrade() -> None:
    """Remove OpenRouter model metadata fields and restore max_tokens."""
    # Drop index
    op.drop_index(op.f('ix_model_configs_canonical_slug'), table_name='model_configs')

    # Drop new columns
    op.drop_column('model_configs', 'raw')
    op.drop_column('model_configs', 'supported_parameters')
    op.drop_column('model_configs', 'per_request_limits')
    op.drop_column('model_configs', 'is_moderated')
    op.drop_column('model_configs', 'max_completion_tokens')
    op.drop_column('model_configs', 'top_provider_context_length')
    op.drop_column('model_configs', 'architecture')
    op.drop_column('model_configs', 'model_created')
    op.drop_column('model_configs', 'description')
    op.drop_column('model_configs', 'canonical_slug')

    # Restore the old max_tokens column
    op.add_column('model_configs', sa.Column('max_tokens', sa.Integer(), nullable=True))
