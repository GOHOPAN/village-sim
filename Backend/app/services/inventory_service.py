from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.inventory import InventoryItem


def get_inventory(db: Session, owner_type: str, owner_id: int) -> list[InventoryItem]:
    stmt = select(InventoryItem).where(InventoryItem.owner_type == owner_type, InventoryItem.owner_id == owner_id)
    return list(db.execute(stmt).scalars().all())


def get_item(db: Session, owner_type: str, owner_id: int, item_name: str) -> InventoryItem | None:
    stmt = select(InventoryItem).where(
        InventoryItem.owner_type == owner_type,
        InventoryItem.owner_id == owner_id,
        InventoryItem.item_name == item_name,
    )
    return db.execute(stmt).scalar_one_or_none()


def add_item(db: Session, owner_type: str, owner_id: int, item_name: str, quantity: int = 1) -> InventoryItem:
    row = get_item(db, owner_type, owner_id, item_name)
    if row is None:
        row = InventoryItem(owner_type=owner_type, owner_id=owner_id, item_name=item_name, quantity=quantity)
    else:
        row.quantity += quantity
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def remove_item(db: Session, owner_type: str, owner_id: int, item_name: str, quantity: int = 1) -> bool:
    """수량이 부족하면 False를 반환하고 아무것도 바꾸지 않는다."""
    row = get_item(db, owner_type, owner_id, item_name)
    if row is None or row.quantity < quantity:
        return False
    row.quantity -= quantity
    if row.quantity <= 0:
        db.delete(row)
    else:
        db.add(row)
    db.commit()
    return True
