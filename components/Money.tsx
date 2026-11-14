import React from 'react';
import { formatILS } from '../shared/money';

export interface MoneyProps {
  amount: unknown;
  fromAgorot?: boolean;
  forceDecimals?: boolean;
  className?: string;
  prefix?: string;
  suffix?: string;
}

export const Money: React.FC<MoneyProps> = ({
  amount,
  fromAgorot = false,
  forceDecimals = false,
  className,
  prefix = '',
  suffix = '',
}) => {
  return (
    <bdi dir="ltr" className={className}>
      {prefix}
      {formatILS(amount, { fromAgorot, forceDecimals })}
      {suffix}
    </bdi>
  );
};
