ALTER TABLE "user" ADD CONSTRAINT "user_credits_non_negative" CHECK ("user"."credits" >= 0);--> statement-breakpoint
ALTER TABLE "video_task" ADD CONSTRAINT "video_task_amounts_non_negative" CHECK ("video_task"."credit_cost" >= 0 and "video_task"."progress" >= 0);--> statement-breakpoint
ALTER TABLE "credit_transaction" ADD CONSTRAINT "credit_transaction_amounts_non_negative" CHECK ("credit_transaction"."amount" >= 0 and "credit_transaction"."balance_before" >= 0 and "credit_transaction"."balance_after" >= 0);--> statement-breakpoint
ALTER TABLE "image_task" ADD CONSTRAINT "image_task_amounts_non_negative" CHECK ("image_task"."credit_cost" >= 0);--> statement-breakpoint
ALTER TABLE "ppt_task" ADD CONSTRAINT "ppt_task_amounts_non_negative" CHECK ("ppt_task"."credit_cost_per_page" >= 0 and "ppt_task"."credit_cost_total" >= 0
      and "ppt_task"."refunded_credits" >= 0 and "ppt_task"."page_count" >= 0);--> statement-breakpoint
ALTER TABLE "credit_package" ADD CONSTRAINT "credit_package_amounts_non_negative" CHECK ("credit_package"."price" >= 0
      and ("credit_package"."credits" is null or "credit_package"."credits" >= 0)
      and ("credit_package"."daily_credits" is null or "credit_package"."daily_credits" >= 0)
      and ("credit_package"."duration_days" is null or "credit_package"."duration_days" >= 0));--> statement-breakpoint
ALTER TABLE "user_subscription" ADD CONSTRAINT "user_subscription_credits_non_negative" CHECK ("user_subscription"."daily_credits" >= 0 and "user_subscription"."daily_credits_remaining" >= 0
      and "user_subscription"."monthly_credits" >= 0 and "user_subscription"."monthly_credits_remaining" >= 0
      and "user_subscription"."monthly_cycle_index" >= 0);--> statement-breakpoint
ALTER TABLE "redemption_code" ADD CONSTRAINT "redemption_code_credits_non_negative" CHECK ("redemption_code"."credits" >= 0);