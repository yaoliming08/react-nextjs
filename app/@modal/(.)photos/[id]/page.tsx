
// import Photo from '../../../../components/frame'
// import Modal from '../../../../components/model'


const Photos = [
    {
        id:'1',
        name:'aaa',
        href:'https://twitter.com/saminacodes/status/1466479548837482497',
        username:'@saminacodes',
        imageSrc:'https://pbs.twimg.com/media/FFn7X76VgAEVTgs?format=jpg'

    }
]



export default function PhotoModal({params:{id:photoId}}){

    const photo = photoId && Photos.find((p)=>photo.id === photoId)

   //todo 判断
   
//    <Modal>
//    <Photo photo={photo}> </Photo>
//    111111111
// </Modal>
    return (

        <div>111111111</div>


    )
    

}