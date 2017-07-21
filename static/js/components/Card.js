// @flow
import React from 'react';

type CardProps = {
  children: React$Element<*>,
};

const Card = ({ children }: CardProps) => (
  <div className="card">
    { children }
  </div>
);

export default Card;
