import BlockTitle from '../components/BlockTitle.jsx';
import Reveal from '../components/Reveal.jsx';

function Person({ person, anim, delay, showFamily }) {
  return (
    <Reveal anim={anim} delay={delay} className="person">
      <div className="person-photo">
        {person.photo ? <img src={person.photo} alt={person.name} loading="lazy" /> : <span className="person-photo-empty">♥</span>}
        <span className="person-photo-ring" aria-hidden="true" />
      </div>

      <p className="person-role">{person.role}</p>
      <h3 className="person-name">{person.name}</h3>

      {person.quote && <p className="person-quote">“{person.quote}”</p>}

      {showFamily && (
        <div className="person-family">
          <span>{person.father}</span>
          <span>{person.mother}</span>
          {person.address && <span className="person-address">{person.address}</span>}
        </div>
      )}

      {person.facebook && (
        <a className="person-link" href={person.facebook} target="_blank" rel="noreferrer">Facebook</a>
      )}
    </Reveal>
  );
}

export default function CoupleSection({ data, content }) {
  const { groom, bride } = content.couple;

  return (
    <section className="block block-couple" id={data.id}>
      <BlockTitle title={data.title} subtitle={data.subtitle} />

      <div className="couple-grid">
        <Person person={groom} anim="left" delay={0} showFamily={data.showFamily} />
        <Reveal anim="zoom" delay={180} className="couple-heart" aria-hidden="true">
          <span>❦</span>
        </Reveal>
        <Person person={bride} anim="right" delay={120} showFamily={data.showFamily} />
      </div>
    </section>
  );
}
