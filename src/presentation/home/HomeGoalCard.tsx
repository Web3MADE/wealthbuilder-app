export function HomeGoalCard() {
  return (
    <section className="home-card home-goal" id="goal">
      <div className="home-card-heading">
        <h2>Your goal</h2>
        <a href="/strategy">Edit</a>
      </div>
      <div className="home-goal-main">
        <span className="home-goal-icon">⌂</span>
        <div>
          <strong>Long-term wealth</strong>
          <p>Grow and build financial freedom</p>
        </div>
      </div>
      <div className="home-goal-progress">
        <span>
          <i />
        </span>
        <small>7 / 10 years</small>
      </div>
      <p className="home-on-track">
        <i />
        On track
      </p>
    </section>
  );
}
