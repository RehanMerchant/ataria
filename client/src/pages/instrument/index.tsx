import { useParams } from "react-router-dom";

const Instrument = () => {
      const { slug } = useParams();
  return (
    <div>Instrument {slug}</div>
  )
}

export default Instrument