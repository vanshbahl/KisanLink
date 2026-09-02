from sqlalchemy import JSON, Integer
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class PrototypeState(Base):
    __tablename__ = "prototype_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    data: Mapped[dict] = mapped_column(JSON, nullable=False)
