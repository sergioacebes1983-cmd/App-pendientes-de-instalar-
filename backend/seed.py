import asyncio

from lib.bootstrap import seed_if_empty
from lib.db import ensure_indexes


async def main() -> None:
    await ensure_indexes()
    await seed_if_empty()
    print("seed ok")


if __name__ == "__main__":
    asyncio.run(main())
