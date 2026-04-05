import { Router, type IRouter } from "express";
import healthRouter from "./health";
import decksRouter from "./decks";
import cardsRouter from "./cards";
import generateRouter from "./generate";
import exportApkgRouter from "./export-apkg";

const router: IRouter = Router();

router.use(healthRouter);
router.use(decksRouter);
router.use(cardsRouter);
router.use(generateRouter);
router.use(exportApkgRouter);

export default router;
