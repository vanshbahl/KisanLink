"""
Random sample selection for bulk-lot inspections.

This is a deliberately simple, transparent, prototype-safe rule — NOT a formal
AQL/statistical certification scheme. It exists to satisfy one anti-fraud property:
which containers get opened and inspected must not be chosen (or predictable) by the
farmer or the person doing the inspection. Selection is server-side, uses a
cryptographically-seeded RNG, and — once persisted by the caller — must not be
regenerated for the same (lot, checkpoint) pair.
"""

import math
import secrets
from typing import Any, List, Tuple

POSITION_CYCLE = [
    "Upper / outer layer",
    "Middle / interior section",
    "Lower / interior section",
]


def compute_sample_size(container_count: int) -> int:
    """Scale sample size with container count. Always at least 1, never more than the lot."""
    if container_count <= 1:
        return container_count
    if container_count <= 5:
        return 2
    if container_count <= 12:
        return 3
    if container_count <= 24:
        return 4
    return min(container_count, max(4, math.ceil(container_count * 0.15)))


def generate_sample(container_count: int) -> Tuple[int, List[int]]:
    """Server-side random draw of container numbers (1-indexed), via secrets.SystemRandom."""
    if container_count < 1:
        raise ValueError("container_count must be >= 1")
    sample_size = compute_sample_size(container_count)
    rng = secrets.SystemRandom()
    selected = sorted(rng.sample(range(1, container_count + 1), sample_size))
    return sample_size, selected


def build_instructions(selected_containers: List[int]) -> List[dict[str, Any]]:
    """Per-container capture guidance, cycling through a fixed set of interior positions
    so a farmer cannot predict in advance which slice of a given crate will be opened."""
    instructions: List[dict[str, Any]] = []
    for i, container_number in enumerate(selected_containers):
        position = POSITION_CYCLE[i % len(POSITION_CYCLE)]
        instructions.append(
            {
                "container_number": container_number,
                "position": position,
                "note": (
                    f"Open container {container_number} and capture 4-6 representative "
                    f"pieces from the {position.lower()}."
                ),
            }
        )
    return instructions
