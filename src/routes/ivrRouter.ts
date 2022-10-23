import { Router } from "express";
import {
  greetUser,
  initialInteraction,
  orderProduct,
  pay,
  paymentComplete,
} from "../controllers/ivrController";

const router = Router();

router.post("/welcome", greetUser);
router.post("/initial", initialInteraction);
router.post("/order", orderProduct);
router.post("/pay", pay);
router.post("/payment-completed", paymentComplete);

export default router;
