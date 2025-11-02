"""drop users table

Revision ID: 5c084a14402e
Revises: e1173acf8985
Create Date: 2025-11-02 08:43:25.367782

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5c084a14402e'
down_revision: Union[str, Sequence[str], None] = 'e1173acf8985'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Drop users table and its indexes
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_table('users')


def downgrade() -> None:
    """Downgrade schema."""
    # Recreate users table
    op.create_table('users',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('email', sa.VARCHAR(length=255), nullable=False),
    sa.Column('username', sa.VARCHAR(length=100), nullable=False),
    sa.Column('password_hash', sa.VARCHAR(length=255), nullable=False),
    sa.Column('is_active', sa.BOOLEAN(), nullable=True),
    sa.Column('created_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.Column('updated_at', postgresql.TIMESTAMP(timezone=True), server_default=sa.text('now()'), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)