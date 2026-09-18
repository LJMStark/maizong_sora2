import type { Metadata } from "next";
import Link from "next/link";
import { APP_BRAND } from "@/lib/brand";
import { LEGAL_ENTITY_NAME, SUPPORT_EMAIL } from "@/lib/legal-contact";

export const metadata: Metadata = {
  title: "隐私政策",
  description: `${APP_BRAND} 如何收集、使用与保留你的数据，以及你可以行使的权利。`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <h1>隐私政策</h1>
      <p>
        本政策说明 {LEGAL_ENTITY_NAME} 在你使用 {APP_BRAND} 时收集哪些数据、
        为什么收集、保留多久，以及你可以怎么处置这些数据。
      </p>

      <h2>一、我们收集什么</h2>
      <ul>
        <li>
          <strong>账号信息</strong>——用户名、邮箱、密码哈希、注册时间。
          密码以单向哈希存储，我们无法读取明文。
        </li>
        <li>
          <strong>你提交的创作内容</strong>——提示词文本、上传的参考图、
          生成结果（图像／视频／文档）。
        </li>
        <li>
          <strong>使用与计费记录</strong>——任务类型与时间、积分流水、订单记录。
        </li>
        <li>
          <strong>技术日志</strong>——IP 地址、User-Agent、请求路径与错误信息。
          用于排障、限流与反滥用。
        </li>
      </ul>
      <p>
        我们<strong>不收集</strong>位置、通讯录、生物识别模板，
        也不使用第三方广告或跨站追踪 Cookie。站点使用的 Cookie 仅为登录会话所必需
        （<code>HttpOnly</code> + <code>Secure</code>），无需征求额外同意。
      </p>

      <h2>二、处理的法律依据</h2>
      <ul>
        <li>
          <strong>履行合同</strong>（GDPR 第 6(1)(b) 条）——账号、生成任务、积分与订单。
        </li>
        <li>
          <strong>正当利益</strong>（第 6(1)(f) 条）——安全日志、反滥用、限流。
        </li>
        <li>
          <strong>明示同意</strong>（第 6(1)(a) 条、涉及人脸等特征时为第 9(2)(a) 条）
          ——你主动上传含有人物面部的图片时。你可随时撤回同意，方式是删除该内容。
        </li>
        <li>
          <strong>法定义务</strong>（第 6(1)(c) 条）——涉嫌违法内容的记录留存与配合执法。
        </li>
      </ul>

      <h2>三、谁会接触到这些数据</h2>
      <p>我们不出售数据。为提供服务，下列<strong>类别</strong>的处理方会接触到必要的最小数据：</p>
      <ul>
        <li>
          <strong>境外 AI 模型服务商</strong>——接收你的提示词与参考图以完成生成。
          我们通过标准合同条款（SCCs）约束其处理范围。
        </li>
        <li>
          <strong>云主机与对象存储服务商</strong>——托管应用与你的作品文件。
        </li>
        <li>
          <strong>交易邮件服务商</strong>——发送验证与重置密码邮件，仅接收邮箱地址。
        </li>
      </ul>
      <p>
        数据存储与处理发生在中国大陆境外。如你位于欧洲经济区、英国或瑞士，
        这构成跨境传输，依据为上述 SCCs。
      </p>
      <p>
        <strong>我们不会把你的提示词或上传内容用于训练任何模型</strong>，
        也不会将其提供给第三方用于训练。
      </p>

      <h2>四、保留多久</h2>
      <ul>
        <li>
          <strong>上传的参考图</strong>——用完即删，仅在任务处理期间保留。
        </li>
        <li>
          <strong>生成结果</strong>——保留至你删除或注销账号。
          对外访问一律通过服务端签发的<strong>限时链接</strong>，
          存储桶本身不可匿名读取。
        </li>
        <li>
          <strong>积分与订单流水</strong>——账务与对账需要，自交易发生起保留 5 年。
        </li>
        <li>
          <strong>技术日志</strong>——30 天后滚动删除。
        </li>
        <li>
          <strong>涉嫌违法内容的证据与关联账号信息</strong>——
          依法留存并向主管机构报告，
          <strong>此类记录不随账号注销或删除请求一并删除</strong>。
        </li>
      </ul>

      <h2>五、你的权利</h2>
      <p>你可以要求访问、更正、删除、导出你的数据，限制或反对某项处理，以及撤回同意。</p>
      <ul>
        <li>
          删除单个作品：在「我的作品」中直接删除。
          请注意——签名链接过期与 CDN 缓存是两件事，
          要立刻断开某个文件的访问，删除该文件是唯一可靠方式（我们即执行此操作）。
        </li>
        <li>注销账号：在个人中心操作，或发信给我们。</li>
        <li>
          其他请求：发信至 <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>，
          我们在 30 日内回复。
        </li>
      </ul>
      <p>
        若你认为我们的处理违法，你有权向所在地的数据保护监管机构投诉。
      </p>

      <h2>六、AI 生成内容的透明度</h2>
      <p>
        本服务输出的内容为 AI 生成或合成。我们在界面上作可感知的提示，
        并在文件元数据中写入生成属性标识，具体方式与样式见
        <Link href="/terms">服务条款</Link>第五条。该标识面向内容的下游接收者；
        它<strong>不能替代</strong>本政策对被拍摄者所承担的告知义务——
        如你上传含有他人肖像的图片，应由你向该人说明用途并取得同意。
      </p>

      <h2>七、儿童</h2>
      <p>
        本服务不面向 18 周岁以下人群，我们不会有意收集其数据。
        如你认为我们持有未成年人的数据，请联系我们，我们将核实并删除。
      </p>

      <h2>八、变更</h2>
      <p>本政策更新后会修改页尾日期；涉及你权利的重大变更将另行通知。</p>

      <h2>九、联系方式</h2>
      <p>
        {LEGAL_ENTITY_NAME} · <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </>
  );
}
