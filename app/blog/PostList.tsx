import Link from "next/link";

export default function PostLink({posts}){


    return (
        <ul>
            {
                posts.map((item)=>(
               <li key={item.id}>
                <Link href={`/blog/${item.slug}`}>
                    {item.title}
                </Link>
               </li> 
                ))
            }
        </ul>
    )
}