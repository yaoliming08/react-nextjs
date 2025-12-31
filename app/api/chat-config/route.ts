import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

/**
 * 聊天配置API
 * GET: 获取配置列表或单个配置
 * POST: 创建新配置
 * PUT: 更新配置
 * DELETE: 删除配置
 */

// 获取配置列表或单个配置
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pageKey = searchParams.get('page_key')
    const id = searchParams.get('id')

    if (id) {
      // 根据ID获取单个配置
      const rows = await query(
        'SELECT * FROM chat_config WHERE id = ?',
        [id]
      ) as any[]
      
      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '配置不存在' },
          { status: 404 }
        )
      }

      const config = rows[0]
      // 解析JSON字段
      config.config_data = typeof config.config_data === 'string' 
        ? JSON.parse(config.config_data) 
        : config.config_data

      return NextResponse.json({ success: true, data: config })
    }

    if (pageKey) {
      // 根据页面标识获取配置
      const rows = await query(
        'SELECT * FROM chat_config WHERE page_key = ? AND is_active = 1',
        [pageKey]
      ) as any[]
      
      if (rows.length === 0) {
        return NextResponse.json(
          { success: false, error: '配置不存在' },
          { status: 404 }
        )
      }

      const config = rows[0]
      // 解析JSON字段
      config.config_data = typeof config.config_data === 'string' 
        ? JSON.parse(config.config_data) 
        : config.config_data

      return NextResponse.json({ success: true, data: config })
    }

    // 获取所有配置列表（包含完整配置数据）
    const rows = await query(
      'SELECT * FROM chat_config ORDER BY created_at DESC'
    ) as any[]
    
    // 解析每个配置的JSON字段
    const configsWithParsedData = rows.map(row => ({
      ...row,
      config_data: typeof row.config_data === 'string' 
        ? JSON.parse(row.config_data) 
        : row.config_data
    }))

    return NextResponse.json({ success: true, data: configsWithParsedData })
  } catch (error) {
    console.error('获取配置失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '获取配置失败',
      },
      { status: 500 }
    )
  }
}

// 创建新配置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { page_key, page_name, config_data, description, is_active = 1 } = body

    if (!page_key || !page_name || !config_data) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：page_key, page_name, config_data' },
        { status: 400 }
      )
    }

    // 检查page_key是否已存在
    const existing = await query(
      'SELECT id FROM chat_config WHERE page_key = ?',
      [page_key]
    ) as any[]

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, error: '页面标识已存在' },
        { status: 400 }
      )
    }

    // 插入新配置
    await query(
      'INSERT INTO chat_config (page_key, page_name, config_data, description, is_active) VALUES (?, ?, ?, ?, ?)',
      [page_key, page_name, JSON.stringify(config_data), description || null, is_active]
    )

    return NextResponse.json({ success: true, message: '配置创建成功' })
  } catch (error) {
    console.error('创建配置失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '创建配置失败',
      },
      { status: 500 }
    )
  }
}

// 更新配置
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, page_key, page_name, config_data, description, is_active } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：id' },
        { status: 400 }
      )
    }

    // 构建更新字段
    const updates: string[] = []
    const params: any[] = []

    if (page_name !== undefined) {
      updates.push('page_name = ?')
      params.push(page_name)
    }
    if (config_data !== undefined) {
      updates.push('config_data = ?')
      params.push(JSON.stringify(config_data))
    }
    if (description !== undefined) {
      updates.push('description = ?')
      params.push(description)
    }
    if (is_active !== undefined) {
      updates.push('is_active = ?')
      params.push(is_active)
    }
    if (page_key !== undefined) {
      // 检查新page_key是否已被其他配置使用
      const existing = await query(
        'SELECT id FROM chat_config WHERE page_key = ? AND id != ?',
        [page_key, id]
      ) as any[]
      
      if (existing.length > 0) {
        return NextResponse.json(
          { success: false, error: '页面标识已被使用' },
          { status: 400 }
        )
      }
      
      updates.push('page_key = ?')
      params.push(page_key)
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有要更新的字段' },
        { status: 400 }
      )
    }

    params.push(id)
    await query(
      `UPDATE chat_config SET ${updates.join(', ')} WHERE id = ?`,
      params
    )

    return NextResponse.json({ success: true, message: '配置更新成功' })
  } catch (error) {
    console.error('更新配置失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '更新配置失败',
      },
      { status: 500 }
    )
  }
}

// 删除配置
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数：id' },
        { status: 400 }
      )
    }

    await query('DELETE FROM chat_config WHERE id = ?', [id])

    return NextResponse.json({ success: true, message: '配置删除成功' })
  } catch (error) {
    console.error('删除配置失败:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '删除配置失败',
      },
      { status: 500 }
    )
  }
}

