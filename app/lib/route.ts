import { NextResponse } from 'next/server'
const mysql = require('mysql2/promise')
 
// 创建全局的 MySQL 连接池
const pool = mysql.createPool({
  connectionLimit: 10,
  host: '110.42.239.134:13887', // 服务器地址
  user: 'root',
  password: 'Kjteck@UTdkPD_123', // 密码
  database: 'dseg_cd',
})
 
export async function GET(request:any) {
  try {
    // 从连接池中获取连接
    const connection = await pool.getConnection()
 
    // 执行 MySQL 查询
    const [rows, fields] = await connection.query('SELECT * FROM jacksonblogbacked')
 
    // 释放连接回连接池
    connection.release()
 
    return NextResponse.json({ data: rows }, { status: 200 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}