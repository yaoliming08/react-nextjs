'use client' //客户端渲染时
import React, { useState, useEffect } from 'react'
 
const Home = () => {
  const [data, setData] = useState([])
 
  useEffect(() => {
    fetchData()
  }, [])
 
  const fetchData = async () => {
    try {
      const response = await fetch('/api/getData')
      const res = await response.json()
      const data = res.data[0]
      setData(data.title)
      console.log('data: ', data)
    } catch (error) {
      console.error('Error fetching data:', error)
    }
  }
 
  return (
    <div>
      <h1>测试mysql连接111:{data}</h1>
    </div>
  )
}
 
export default Home