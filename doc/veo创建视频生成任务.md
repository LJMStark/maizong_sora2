# 创建视频生成任务

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/videos/generations:
    post:
      summary: 创建视频生成任务
      deprecated: false
      description: ''
      tags:
        - API文档/VEO
      parameters:
        - name: Authorization
          in: header
          description: 'Bearer token for API authentication'
          required: true
          example: your_api_key_here
          schema:
            type: string
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                model:
                  type: string
                  enum:
                    - veo3.1-fast
                  x-apifox-enum:
                    - value: veo3.1-fast
                      name: ''
                      description: ''
                prompt:
                  type: string
                aspect_ratio:
                  type: string
                  enum:
                    - '16:9'
                    - '9:16'
                  x-apifox-enum:
                    - value: '16:9'
                      name: ''
                      description: ''
                    - value: '9:16'
                      name: ''
                      description: ''
                duration:
                  type: integer
                  enum:
                    - 8
                  x-apifox-enum:
                    - value: 8
                      name: 时长
                      description: 写死为8
                image_urls:
                  type: array
                  items:
                    type: string
                    description: '["http://example.com/image1.jpg"]'
                  maxItems: 3
                generation_type:
                  type: string
                  title: 视频生成模式
                  description: |-
                    视频生成模式，默认会根据图像数量进行匹配，建议手动选择，可选三种模式：
                    当前参考图生视频REFERENCE模式仅支持16:9比例
                  enum:
                    - TEXT
                    - FIRST&LAST
                    - REFERENCE
                  x-apifox-enum:
                    - value: TEXT
                      name: 文本生视频
                      description: ''
                    - value: FIRST&LAST
                      name: 首尾帧生视频，可传入1~2张图像
                      description: ''
                    - value: REFERENCE
                      name: 参考图生视频，最多可传入3张图像
                      description: 此时图片为视频中的元素
              required:
                - model
                - prompt
              x-apifox-orders:
                - model
                - prompt
                - aspect_ratio
                - duration
                - image_urls
                - generation_type
            example:
              model: veo3.1-fast
              prompt: The car moves forward at a high speed
              aspect_ratio: '16:9'
              duration: 8
              image_urls:
                - https://crea-img.xinzhiyun.net/upload/202502251100509684.jpg
              generation_type: TEXT
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties: {}
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: API文档/VEO
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4804237/apis/api-393471292-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: https://duomiapi.com
    description: 开发环境
security: []

```