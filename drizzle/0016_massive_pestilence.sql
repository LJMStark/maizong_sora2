CREATE INDEX "video_task_active_idx" ON "video_task" USING btree ("status","updated_at") WHERE "video_task"."status" in ('pending', 'running', 'retrying');--> statement-breakpoint
CREATE INDEX "video_task_error_idx" ON "video_task" USING btree ("updated_at") WHERE "video_task"."status" = 'error';--> statement-breakpoint
CREATE INDEX "credit_transaction_user_type_idx" ON "credit_transaction" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "credit_transaction_reference_idx" ON "credit_transaction" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "credit_transaction_source_txn_idx" ON "credit_transaction" USING btree (("metadata" ->> 'sourceTransactionId'));--> statement-breakpoint
CREATE INDEX "image_task_error_idx" ON "image_task" USING btree ("updated_at") WHERE "image_task"."status" = 'error';--> statement-breakpoint
CREATE INDEX "ppt_slide_refund_audit_idx" ON "ppt_slide" USING btree ("updated_at") WHERE "ppt_slide"."refunded" = true OR "ppt_slide"."status" in ('error', 'cancelled');