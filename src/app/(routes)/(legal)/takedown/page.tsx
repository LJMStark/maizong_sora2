import type { Metadata } from "next";
import { APP_BRAND } from "@/lib/brand";
import {
  ABUSE_EMAIL,
  DMCA_EMAIL,
  LEGAL_ENTITY_NAME,
} from "@/lib/legal-contact";

export const metadata: Metadata = {
  title: "侵权与滥用举报",
  description: `向 ${APP_BRAND} 举报侵权内容或非自愿私密影像，以及我们的处理时限。`,
  alternates: { canonical: "/takedown" },
};

export default function TakedownPage() {
  return (
    <>
      <h1>侵权与滥用举报</h1>
      <p>
        我们对两类举报设有独立通道与不同的处理时限。
        请按内容性质选择对应通道——走错通道会延误处理。
      </p>

      <h2>紧急：非自愿私密影像（NCII）</h2>
      <p>
        如果本服务上出现了<strong>未经你同意的、涉及你本人的私密影像</strong>
        （包含真实拍摄与 AI 换脸／合成两种情形），请立即发信至：
      </p>
      <p>
        <a href={`mailto:${ABUSE_EMAIL}`}>
          <strong>{ABUSE_EMAIL}</strong>
        </a>
      </p>
      <p>
        我们在收到有效请求后<strong>48 小时内</strong>移除该内容，
        并尽合理努力移除我们已知的<strong>全部相同副本</strong>。
        你本人或你的授权代理人均可提交。
      </p>
      <h3>请在信中提供</h3>
      <ol>
        <li>你的姓名与联系方式（代理人提交时请附授权说明）。</li>
        <li>能定位到内容的信息：页面链接、图片／视频链接，或作品编号。</li>
        <li>
          一句声明：影像中的人物是你本人，且你
          <strong>未同意</strong>其被制作或传播。
        </li>
        <li>（可选但有帮助）能证明你身份的材料。我们仅用于核实，核实后即删除。</li>
      </ol>
      <p>
        涉及未成年人的内容我们会
        <strong>依法向主管机构报告并按法定要求留存证据</strong>
        ——这部分留存不受删除请求影响。若你正处于紧急危险中，请优先联系当地执法机关。
      </p>

      <h2>版权侵权（DMCA）</h2>
      <p>
        版权人或其授权代理人可向我们指定的代理人提交下架通知：
      </p>
      <p>
        <a href={`mailto:${DMCA_EMAIL}`}>
          <strong>{DMCA_EMAIL}</strong>
        </a>
      </p>
      <h3>有效通知须包含（17 U.S.C. §512(c)(3)）</h3>
      <ol>
        <li>你的实体或电子签名。</li>
        <li>被侵权作品的标识。</li>
        <li>被指侵权内容的标识与足以定位它的信息。</li>
        <li>你的联系方式（地址、电话、邮箱）。</li>
        <li>
          一项<strong>善意声明</strong>
          ：你认为该使用未获版权人、其代理人或法律的授权。
        </li>
        <li>
          一项<strong>准确性声明</strong>
          ：通知中的信息准确，且你在承担作伪证责任的前提下声明你有权代表版权人行事。
        </li>
      </ol>
      <p>
        我们会移除相应内容并通知上传者。上传者可提交反通知；
        我们收到符合要求的反通知后，会转交给你，并可能在 10–14 个工作日后恢复内容，
        除非你已就此提起诉讼。
      </p>
      <p>
        <strong>请注意：</strong>
        明知虚假地声明内容侵权，须依 §512(f) 对因此产生的损失、费用与律师费负责。
      </p>

      <h2>其他违规内容</h2>
      <p>
        涉及冒充他人、诈骗、暴力、违法信息等，也请发至{" "}
        <a href={`mailto:${ABUSE_EMAIL}`}>{ABUSE_EMAIL}</a>，
        我们在 5 个工作日内处理。
      </p>

      <h2>反复侵权账号</h2>
      <p>
        我们对反复收到有效侵权通知的账号执行终止政策，包括永久封停与拒绝重新注册。
      </p>

      <p>{LEGAL_ENTITY_NAME}</p>
    </>
  );
}
