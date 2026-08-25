import BlockTitle from '../components/BlockTitle.jsx';
import Reveal from '../components/Reveal.jsx';

export default function StorySection({ data }) {
  const items = data.items || [];

  return (
    <section className="block block-story" id={data.id}>
      <BlockTitle title={data.title} subtitle={data.subtitle} />

      <div className="timeline">
        <span className="timeline-line" aria-hidden="true" />

        {items.map((item, i) => (
          <Reveal
            key={item.id || i}
            anim={i % 2 === 0 ? 'left' : 'right'}
            delay={80}
            className={`timeline-item ${i % 2 === 0 ? 'is-left' : 'is-right'}`}
          >
            <span className="timeline-dot" aria-hidden="true" />

            <div className="timeline-card">
              {item.image && (
                <div className="timeline-image">
                  <img src={item.image} alt={item.title} loading="lazy" />
                </div>
              )}
              <span className="timeline-date">{item.date}</span>
              <h3 className="timeline-title">{item.title}</h3>
              <p className="timeline-text">{item.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
