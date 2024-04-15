'use client'

export default function Error({
    error,
    reset
}:{
    error:Error,
    reset:()=>void
}){

    return (
        <div>
            <h2>有错误了</h2>
            <button onClick={()=>reset()}>重试一下</button>
        </div>
    )

}
