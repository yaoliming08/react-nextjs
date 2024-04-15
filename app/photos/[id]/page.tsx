
import Photo from "@/components/frame"
const photos = [
    {
        id:'1',
        name:'aaa',
        href:'https://twitter.com/saminacodes/status/1466479548837482497',
        username:'@saminacodes',
        imageSrc:'https://pbs.twimg.com/media/FFn7X76VgAEVTgs?format=jpg'

    }
]

export default function PhotoPage({params}){
    const photo = photos.find((p)=> p.id === params.id)
    // const photo = photos

    console.log(photo,111111111)
    

    return (
        <div className={"container mx-auto my-10"}>
            <div className={"w-1/2 mx-auto border border-amber-600"}>
                <Photo photo={photo}></Photo>

            </div>

        </div>
    )

}