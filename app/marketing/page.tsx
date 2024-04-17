'use client' //客户端渲染时
import React, { useState, useEffect } from 'react'



export default function Page() {
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
        console.log('data1111: ', data)
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }


    return (
        <h1 className="text-3xl text-blue-500">marketing页面</h1>
    )
  }