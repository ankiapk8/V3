import { Router, type IRouter } from "express";
import healthRouter from "./health";
import configRouter from "./config";
import decksRouter from "./decks";
import cardsRouter from "./cards";
import generateRouter from "./generate";
import exportApkgRouter from "./export-apkg";
import extractPdfRouter from "./extract-pdf";
import explainRouter from "./explain";
import transferRouter from "./transfer";
import generationsRouter from "./generations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(configRouter);
router.use(decksRouter);
router.use(cardsRouter);
router.use(generateRouter);
router.use(exportApkgRouter);
router.use(extractPdfRouter);
router.use(explainRouter);
router.use(transferRouter);
router.use(generationsRouter);

export default router;
