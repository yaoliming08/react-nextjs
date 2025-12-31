/**
 * 数据库连接配置和工具
 */
import mysql from 'mysql2/promise'

// 数据库配置
export const dbConfig = {
  host: 'localhost',      // 或者 127.0.0.1
  port: 3306,             // 如果 mysql95 改了端口，这里也要改
  user: 'root',           // 如果不是 root，改成你自己的 MySQL 用户名
  password: '199808',     // 你提供的密码
  database: 'xl'          // 你截图里的库名
}

// 创建全局的 MySQL 连接池
export const pool = mysql.createPool({
  connectionLimit: 10,
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
  waitForConnections: true,
  queueLimit: 0,
})

/**
 * 执行查询
 */
export async function query(sql: string, params?: any[]) {
  const connection = await pool.getConnection()
  try {
    const [rows] = await connection.execute(sql, params || [])
    return rows
  } finally {
    connection.release()
  }
}

