import * as React from "react";

export default function JiraIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} {...props}>
      <path
        fill="#2684FF"
        d="M11.53 2H8.69c-.05 0-.1.02-.14.05L2.1 8.55c-.09.09-.09.24 0 .33l4.88 4.88c.09.09.24.09.33 0l5.45-5.45c.03-.04.05-.09.05-.14V2.14c0-.06-.05-.14-.13-.14Z"
      />
      <path
        fill="url(#jira-gradient-a)"
        d="M11.53 8.69c0-.05-.02-.1-.05-.14L5.03 2.1c-.09-.09-.24-.09-.33 0L2.1 4.7c-.09.09-.09.24 0 .33l5.45 5.45c.04.03.09.05.14.05h3.84c.06 0 .14-.05.14-.13V8.83Z"
      />
      <path
        fill="#2684FF"
        d="M16.47 22h2.84c.05 0 .1-.02.14-.05l6.45-6.48c.09-.09.09-.24 0-.33l-4.88-4.88c-.09-.09-.24-.09-.33 0l-5.45 5.45c-.03.04-.05.09-.05.14v3.69c0 .06.05.14.13.14Z"
      />
      <path
        fill="url(#jira-gradient-b)"
        d="M16.47 15.31c0 .05.02.1.05.14l6.45 6.45c.09.09.24.09.33 0l2.6-2.6c.09-.09.09-.24 0-.33l-5.45-5.45c-.04-.03-.09-.05-.14-.05h-3.84c-.06 0-.14.05-.14.13v3.69Z"
      />
      <defs>
        <linearGradient
          id="jira-gradient-a"
          x1="8.25"
          y1="3.81"
          x2="3.18"
          y2="8.88"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
        <linearGradient
          id="jira-gradient-b"
          x1="19.72"
          y1="15.31"
          x2="14.65"
          y2="20.38"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0052CC" />
          <stop offset="1" stopColor="#2684FF" />
        </linearGradient>
      </defs>
    </svg>
  );
}
