import { Github, Linkedin, Mail, Globe } from '@/components/icons';
import { Reveal, StaggerGrid, StaggerItem } from '@/components/motion';

export default function Contact() {
  const developers = [
    {
      name: 'Syed Muharram Ali',
      role: 'Full-Stack Developer',
      image: '/images/developers/sma.jpeg',
      github: 'https://github.com/syedmuharramali',
      linkedin: 'https://www.linkedin.com/in/syedmuharramali',
      email: 'mailto:syedmuharramali.dev@gmail.com',
      website: 'https://syedmuharramali.com',
    },
    {
      name: 'Iftikhar Ali',
      role: 'Full-Stack Developer',
      image: '/images/developers/ia.jpeg',
      github: 'https://github.com/IFTIKHAR5',
      linkedin: 'https://www.linkedin.com/in/iftikhar-ali-23s2002/',
    }
  ];

  return (
    <div className="container-page px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-24 max-w-7xl mx-auto">
      <Reveal>
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 md:mb-20">
          <p className="flex items-center justify-center gap-3 text-xs font-bold uppercase tracking-[0.2em] text-[#B07F2E] mb-4">
            <span className="h-px w-8 bg-[#C8923B]" aria-hidden="true" /> Get in Touch
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink mb-5">
            Meet the Developers
          </h1>
          <p className="text-ink-2 text-base sm:text-lg">
            We built the Gilgit Rental Platform to make finding a home easier. Feel free to connect with us for questions, feedback, or collaboration.
          </p>
        </div>
      </Reveal>

      {/* Changed to lg:grid-cols-2 so tablet views don't squash the flex-row layout */}
      <StaggerGrid className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10 max-w-5xl mx-auto">
        {developers.map((dev) => (
          <StaggerItem 
            key={dev.name} 
            className="card p-6 sm:p-8 lg:p-10 hover:shadow-lift transition-shadow flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start text-center sm:text-left"
          >
            <img 
              src={dev.image} 
              alt={`${dev.name} profile`} 
              className="w-28 h-28 sm:w-32 sm:h-32 lg:w-36 lg:h-36 rounded-full object-cover shadow-sm border-2 border-gray-50 shrink-0"
            />
            
            <div className="flex-1 w-full min-w-0">
              <h2 className="text-xl sm:text-2xl font-bold text-ink mb-1.5">{dev.name}</h2>
              <p className="text-pine font-medium text-sm sm:text-base mb-6">{dev.role}</p>

              <ul className="flex flex-col items-center sm:items-start space-y-4">
                {dev.email && (
                  <li className="w-full max-w-[280px] sm:max-w-none">
                    <a href={dev.email} className="flex items-center justify-center sm:justify-start gap-3.5 text-ink-2 hover:text-pine transition-colors group">
                      <Mail className="w-5 h-5 shrink-0 group-hover:-translate-y-0.5 transition-transform" /> 
                      <span className="truncate text-sm sm:text-base">{dev.email.replace('mailto:', '')}</span>
                    </a>
                  </li>
                )}
                {dev.website && (
                  <li className="w-full">
                    <a href={dev.website} target="_blank" rel="noreferrer" className="flex items-center justify-center sm:justify-start gap-3.5 text-ink-2 hover:text-pine transition-colors group">
                      <Globe className="w-5 h-5 shrink-0 group-hover:-translate-y-0.5 transition-transform" /> 
                      <span className="truncate text-sm sm:text-base">{dev.website.replace('https://', '')}</span>
                    </a>
                  </li>
                )}
                {dev.github && (
                  <li className="w-full">
                    <a href={dev.github} target="_blank" rel="noreferrer" className="flex items-center justify-center sm:justify-start gap-3.5 text-ink-2 hover:text-pine transition-colors group">
                      <Github className="w-5 h-5 shrink-0 group-hover:-translate-y-0.5 transition-transform" /> 
                      <span className="text-sm sm:text-base">GitHub Profile</span>
                    </a>
                  </li>
                )}
                {dev.linkedin && (
                  <li className="w-full">
                    <a href={dev.linkedin} target="_blank" rel="noreferrer" className="flex items-center justify-center sm:justify-start gap-3.5 text-ink-2 hover:text-pine transition-colors group">
                      <Linkedin className="w-5 h-5 shrink-0 group-hover:-translate-y-0.5 transition-transform" /> 
                      <span className="text-sm sm:text-base">LinkedIn Profile</span>
                    </a>
                  </li>
                )}
              </ul>
            </div>
          </StaggerItem>
        ))}
      </StaggerGrid>
    </div>
  );
}