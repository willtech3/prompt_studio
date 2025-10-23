"""cleanup_dead_tables_and_add_snapshots

Revision ID: 9daa971895a9
Revises: e3b0200f27ce
Create Date: 2025-10-05 13:51:19.247147

"""
from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '9daa971895a9'
down_revision: str | Sequence[str] | None = 'e3b0200f27ce'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Drop unused tables (executions, prompts, openrouter_models) and create snapshots table."""
    # Drop tables in order (foreign keys first)
    op.drop_index('ix_executions_user_id', table_name='executions')
    op.drop_index('ix_executions_prompt_id', table_name='executions')
    op.drop_index('ix_executions_created_at', table_name='executions')
    op.drop_table('executions')

    op.drop_index('ix_prompts_user_id', table_name='prompts')
    op.drop_index('ix_prompts_created_at', table_name='prompts')
    op.drop_table('prompts')

    # Drop openrouter_models table if it exists (may have been created via create_all)
    op.execute("DROP TABLE IF EXISTS openrouter_models")

    # Create snapshots table
    op.create_table(
        'snapshots',
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=True),
        sa.Column('kind', sa.String(length=32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('provider', sa.String(length=32), nullable=True),
        sa.Column('model', sa.String(length=128), nullable=True),
        sa.Column('data', sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Recreate dropped tables and remove snapshots table."""
    # Drop snapshots table
    op.drop_table('snapshots')

    # Recreate prompts table
    op.create_table(
        'prompts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('user_prompt', sa.Text(), nullable=False),
        sa.Column('system_prompt', sa.Text(), nullable=True),
        sa.Column('ai_response', sa.Text(), nullable=True),
        sa.Column('model_id', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_prompts_created_at', 'prompts', ['created_at'], unique=False)
    op.create_index('ix_prompts_user_id', 'prompts', ['user_id'], unique=False)

    # Recreate executions table
    op.create_table(
        'executions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('prompt_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('model_id', sa.String(length=255), nullable=False),
        sa.Column('temperature', sa.Float(), nullable=True),
        sa.Column('max_tokens', sa.Integer(), nullable=True),
        sa.Column('top_p', sa.Float(), nullable=True),
        sa.Column('top_k', sa.Integer(), nullable=True),
        sa.Column('frequency_penalty', sa.Float(), nullable=True),
        sa.Column('presence_penalty', sa.Float(), nullable=True),
        sa.Column('repetition_penalty', sa.Float(), nullable=True),
        sa.Column('min_p', sa.Float(), nullable=True),
        sa.Column('top_a', sa.Float(), nullable=True),
        sa.Column('seed', sa.Integer(), nullable=True),
        sa.Column('reasoning_effort', sa.String(length=50), nullable=True),
        sa.Column('request_payload', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('response_data', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('tokens_prompt', sa.Integer(), nullable=True),
        sa.Column('tokens_completion', sa.Integer(), nullable=True),
        sa.Column('tokens_total', sa.Integer(), nullable=True),
        sa.Column('cost_prompt', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('cost_completion', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('cost_total', sa.Numeric(precision=10, scale=6), nullable=True),
        sa.Column('execution_time_ms', sa.Integer(), nullable=True),
        sa.Column('time_to_first_token_ms', sa.Integer(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.ForeignKeyConstraint(['prompt_id'], ['prompts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_executions_created_at', 'executions', ['created_at'], unique=False)
    op.create_index('ix_executions_prompt_id', 'executions', ['prompt_id'], unique=False)
    op.create_index('ix_executions_user_id', 'executions', ['user_id'], unique=False)
