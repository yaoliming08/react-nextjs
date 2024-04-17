"use client";

import Image from "next/image";
import Link from "next/link";
import PostLink from "./blog/PostList";
import { useRouter } from "next/navigation";

export default function Home() {
  const postData = [
    { id: 1, slug: "AAA", title: "1111" },
    { id: 2, slug: "BBB", title: "2222" },
    { id: 3, slug: "CCC", title: "3333" },
    { id: 4, slug: "DDD", title: "4444" },
  ];

  const router = useRouter();

  return (
    <>
      <h1>app下面page.tsx页面</h1>
      <h1 className="text-4xl text-orange-600">Hello, Next.js!</h1>
      <br />
      <Image
        src="/qq01.JPG"
        width={300}
        height={300}
        className="hidden md:block"
        alt="Screenshots of the dashboard project showing desktop version"
      />
      {/* <img
        src="/qq01.JPG"
        alt="Screenshots of the dashboard project showing desktop version"
      /> */}
      <Link href={"/dashboard"}>DashboardLoading</Link>
      <br />
      <div className="h-0 w-0 border-b-[30px] border-l-[20px] border-r-[20px] border-b-black border-l-transparent border-r-transparent" />
      {/* <PostLink posts={postData}/><br/> */}

      {/* <button type={"button"} onClick={()=>router.push("/dashboard</>")}></button> */}
    </>
  );
}
