import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import studentsRouter from "./students";
import skillsRouter from "./skills";
import placementRouter from "./placement";
import practiceRouter from "./practice";
import teacherRouter from "./teacher";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(aiRouter);
router.use(studentsRouter);
router.use(skillsRouter);
router.use(placementRouter);
router.use(practiceRouter);
router.use(teacherRouter);

export default router;
