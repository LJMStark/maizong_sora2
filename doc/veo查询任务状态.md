# 查询任务状态

## OpenAPI Specification

```yaml
openapi: 3.0.1
info:
  title: ''
  description: ''
  version: 1.0.0
paths:
  /v1/videos/tasks/{task_id}:
    get:
      summary: 查询任务状态
      deprecated: false
      description: ''
      tags:
        - API文档/VEO
      parameters:
        - name: task_id
          in: path
          description: ''
          required: true
          example: 8cb280b3-442e-1db2-43f0-6e73616eb474
          schema:
            type: string
        - name: Authorization
          in: header
          description: 'Bearer token for API authentication'
          required: true
          example: your_api_key_here
          schema:
            type: string
      responses:
        '200':
          description: ''
          content:
            application/json:
              schema:
                type: object
                properties:
                  id:
                    type: string
                  state:
                    type: string
                    enum:
                      - pending
                      - running
                      - succeeded
                      - error
                    x-apifox-enum:
                      - value: pending
                        name: 队列中
                        description: ''
                      - value: running
                        name: 生成中
                        description: ''
                      - value: succeeded
                        name: 已成功
                        description: ''
                      - value: error
                        name: 失败
                        description: ''
                  data:
                    type: object
                    properties:
                      videos:
                        type: array
                        items:
                          type: object
                          properties:
                            url:
                              type: string
                          x-apifox-orders:
                            - url
                    required:
                      - videos
                    x-apifox-orders:
                      - videos
                  progress:
                    type: integer
                  create_time:
                    type: integer
                  update_time:
                    type: integer
                  message:
                    type: string
                  action:
                    type: string
                    enum:
                      - generate
                      - remix
                    x-apifox-enum:
                      - value: generate
                        name: ''
                        description: ''
                      - value: remix
                        name: ''
                        description: ''
                required:
                  - id
                  - state
                  - data
                  - progress
                  - create_time
                  - update_time
                  - message
                  - action
                x-apifox-orders:
                  - id
                  - state
                  - data
                  - progress
                  - create_time
                  - update_time
                  - message
                  - action
          headers: {}
          x-apifox-name: 成功
      security: []
      x-apifox-folder: API文档/VEO
      x-apifox-status: released
      x-run-in-apifox: https://app.apifox.com/web/project/4804237/apis/api-395241449-run
components:
  schemas: {}
  securitySchemes: {}
servers:
  - url: https://duomiapi.com
    description: 开发环境
security: []

```