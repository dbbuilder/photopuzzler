// hydrate.js
import React, { useState, useEffect, useRef } from 'react';
import { hydrateRoot } from 'react-dom/client';

// Validation utilities
const validators = {
  required: value => value.trim() !== '',
  email: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  minLength: (value, length) => value.length >= length,
  phone: value => /^\+?[\d\s-]{10,}$/.test(value)
};

// Animation utilities
const useAnimation = (ref, options = {}) => {
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, options);

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options]);
};

// Enhanced Contact Form with Validation
function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });

  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('');
  const formRef = useRef(null);

  useAnimation(formRef, { threshold: 0.2 });

  const validateField = (name, value) => {
    switch (name) {
      case 'name':
        return validators.required(value) ? '' : 'Name is required';
      case 'email':
        return validators.email(value) ? '' : 'Valid email is required';
      case 'phone':
        return validators.phone(value) ? '' : 'Valid phone number is required';
      case 'message':
        return validators.minLength(value, 10) ? '' : 'Message must be at least 10 characters';
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setStatus('sending');
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setStatus('success');
      setFormData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <form 
      ref={formRef}
      onSubmit={handleSubmit} 
      className="space-y-4 opacity-0 translate-y-4 transition-all duration-500"
    >
      {['name', 'email', 'phone'].map(field => (
        <div key={field}>
          <label className="block mb-2 capitalize">{field}</label>
          <input
            type={field === 'email' ? 'email' : 'text'}
            name={field}
            value={formData[field]}
            onChange={handleChange}
            className={`w-full p-2 rounded bg-gray-800 border ${
              errors[field] ? 'border-red-500' : 'border-gray-700'
            } transition-colors`}
            placeholder={`Your ${field}`}
          />
          {errors[field] && (
            <p className="text-red-500 text-sm mt-1">{errors[field]}</p>
          )}
        </div>
      ))}
      <div>
        <label className="block mb-2">Message</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          className={`w-full p-2 rounded bg-gray-800 border ${
            errors.message ? 'border-red-500' : 'border-gray-700'
          } transition-colors`}
          rows="4"
          placeholder="Your message"
        ></textarea>
        {errors.message && (
          <p className="text-red-500 text-sm mt-1">{errors.message}</p>
        )}
      </div>
      <button
        type="submit"
        disabled={status === 'sending'}
        className={`w-full font-bold py-2 px-4 rounded transition-all duration-300 transform hover:scale-105 ${
          status === 'sending' 
            ? 'bg-gray-600 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {status === 'sending' ? 'Sending...' : 'Send Message'}
      </button>
      {status && (
        <div 
          className={`text-center p-2 rounded animate-fade-in ${
            status === 'success' ? 'bg-green-500/20 text-green-300' : 
            status === 'error' ? 'bg-red-500/20 text-red-300' : ''
          }`}
        >
          {status === 'success' && 'Message sent successfully!'}
          {status === 'error' && 'Failed to send message. Please try again.'}
        </div>
      )}
    </form>
  );
}

// Animated Image Gallery
function ImageGallery() {
  const [images, setImages] = useState([
    { id: 1, src: '/placeholder1.jpg', title: 'Image 1' },
    { id: 2, src: '/placeholder2.jpg', title: 'Image 2' },
    { id: 3, src: '/placeholder3.jpg', title: 'Image 3' }
  ]);
  
  const [selectedImage, setSelectedImage] = useState(null);
  const galleryRef = useRef(null);

  useAnimation(galleryRef);

  return (
    <div 
      ref={galleryRef}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-0 translate-y-4 transition-all duration-500"
    >
      {images.map((image, index) => (
        <div
          key={image.id}
          className="relative group cursor-pointer overflow-hidden rounded-lg"
          style={{ animationDelay: `${index * 100}ms` }}
          onClick={() => setSelectedImage(image)}
        >
          <img
            src={image.src}
            alt={image.title}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-300 flex items-center justify-center">
            <p className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {image.title}
            </p>
          </div>
        </div>
      ))}
      
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div 
            className="max-w-4xl max-h-[90vh] relative animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedImage.src}
              alt={selectedImage.title}
              className="max-w-full max-h-[90vh] object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Animated Carousel
function Carousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const carouselRef = useRef(null);

  const items = [
    { id: 1, title: 'Slide 1', content: 'Content 1' },
    { id: 2, title: 'Slide 2', content: 'Content 2' },
    { id: 3, title: 'Slide 3', content: 'Content 3' }
  ];

  useAnimation(carouselRef);

  const nextSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const prevSlide = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <div 
      ref={carouselRef}
      className="relative overflow-hidden opacity-0 translate-y-4 transition-all duration-500"
    >
      <div 
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="w-full flex-shrink-0 p-8 bg-gray-800"
          >
            <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
            <p>{item.content}</p>
          </div>
        ))}
      </div>
      
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 p-2 rounded-full"
      >
        Previous
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 p-2 rounded-full"
      >
        Next
      </button>
      
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {items.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex ? 'bg-white' : 'bg-gray-500'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// Enhanced component map with new components
const componentMap = {
  'contact-form': ContactForm,
  'image-gallery': ImageGallery,
  'carousel': Carousel
};

// Custom CSS for animations
const style = document.createElement('style');
style.textContent = `
  .animate-in {
    opacity: 1 !important;
    transform: translateY(0) !important;
  }
  
  .animate-scale-in {
    animation: scaleIn 0.3s ease-out;
  }
  
  .animate-fade-in {
    animation: fadeIn 0.3s ease-out;
  }
  
  @keyframes scaleIn {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
  
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);

// Hydrate interactive components
document.querySelectorAll('[data-hydrate]').forEach(container => {
  const componentName = container.getAttribute('data-hydrate');
  const Component = componentMap[componentName];
  
  if (Component) {
    hydrateRoot(container, <Component />);
  }
});

// Export components for SSR
export { ContactForm, ImageGallery, Carousel };