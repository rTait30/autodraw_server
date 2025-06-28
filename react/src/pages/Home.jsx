import React from 'react';

function Home() {
  const name = localStorage.getItem('username');
  const role = localStorage.getItem('role');

  return (
    <div>
      <h1>Hello {name}, you are {role}</h1>
    </div>
  );
}

export default Home;