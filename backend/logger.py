import sys
import logging
from loguru import logger

class InterceptHandler(logging.Handler):
    """
    Класс для перехвата стандартных логов (напр. от uvicorn/fastapi)
    і перенаправлення їх у loguru.
    """
    def emit(self, record):
        # Отримуємо відповідний рівень логування у loguru
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Знаходимо звідки був викликаний логгер, щоб пропустити внутрішні фрейми logging
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(level, record.getMessage())

def setup_logging():
    # Видаляємо дефолтний хендлер loguru
    logger.remove()

    # Додаємо вивід в консоль з красивим форматуванням
    logger.add(
        sys.stdout,
        enqueue=True,
        colorize=True,
        format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    )

    # Додаємо запис у файл з ротацією
    logger.add(
        "err.log",
        rotation="10 MB",
        retention="1 week",
        enqueue=True,
        level="INFO",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"
    )

    # Перехоплюємо логи uvicorn та fastapi
    logging.getLogger("uvicorn.access").handlers = [InterceptHandler()]
    logging.getLogger("uvicorn.error").handlers = [InterceptHandler()]
    logging.getLogger("fastapi").handlers = [InterceptHandler()]
    
    # Вимикаємо прокидання логів uvicorn вище (щоб не дублювалися)
    logging.getLogger("uvicorn.access").propagate = False
    logging.getLogger("uvicorn.error").propagate = False
