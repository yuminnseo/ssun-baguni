export const ColorMenuButton = ({
  color,
}: {
  color: string;
}): JSX.Element => (
  <svg
    aria-hidden="true"
    className="relative h-7 w-7"
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2.4502 13.9992C2.4502 7.62033 7.62129 2.44922 14.0002 2.44922C20.379 2.44922 25.5501 7.62033 25.5501 13.9992C25.5501 20.3781 20.379 25.5492 14.0002 25.5492C7.62129 25.5492 2.4502 20.3781 2.4502 13.9992Z"
      fill={color}
    />
  </svg>
);
