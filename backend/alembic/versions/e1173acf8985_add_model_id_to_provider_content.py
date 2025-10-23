"""add model_id to provider_content

Revision ID: e1173acf8985
Revises: 9daa971895a9
Create Date: 2025-10-06 01:30:03.120024

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e1173acf8985'
down_revision: str | Sequence[str] | None = '9daa971895a9'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    # Clean up technical debt: drop deprecated tables from early prototyping
    # (replaced by snapshots and model_configs in current design)

    # Drop executions first (has FK to prompts)
    op.drop_index(op.f('ix_executions_created_at'), table_name='executions')
    op.drop_index(op.f('ix_executions_prompt_id'), table_name='executions')
    op.drop_index(op.f('ix_executions_user_id'), table_name='executions')
    op.drop_table('executions')

    # Drop prompts second (parent table)
    op.drop_index(op.f('ix_prompts_created_at'), table_name='prompts')
    op.drop_index(op.f('ix_prompts_user_id'), table_name='prompts')
    op.drop_table('prompts')

    # Drop old openrouter_models (replaced by model_configs)
    op.drop_table('openrouter_models')

    # Add model_id column to provider_content for model-specific guidance
    op.add_column('provider_content', sa.Column('model_id', sa.String(length=100), nullable=True))
    op.create_index(op.f('ix_provider_content_model_id'), 'provider_content', ['model_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    # Remove model_id column from provider_content
    op.drop_index(op.f('ix_provider_content_model_id'), table_name='provider_content')
    op.drop_column('provider_content', 'model_id')

    # Note: Not recreating deprecated tables (prompts, executions, openrouter_models)
    # as they were technical debt from early prototyping
