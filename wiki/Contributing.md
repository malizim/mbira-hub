# Contributing to Mbira Hub

Thank you for your interest in contributing to Mbira Hub! This guide will help you get started with contributing to the project.

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **🐛 Bug Reports**: Report issues you encounter
- **✨ Feature Requests**: Suggest new features or improvements
- **📝 Documentation**: Improve or add documentation
- **🔧 Code Contributions**: Fix bugs or implement features
- **🎨 UI/UX Improvements**: Enhance the user interface
- **🧪 Testing**: Help test the application
- **🌐 Translations**: Add support for new languages

## 🚀 Getting Started

### Prerequisites

- **Node.js**: Version 18.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: For version control
- **Docker**: Optional, for containerized development

### Development Setup

1. **Fork the Repository**
   ```bash
   # Fork on GitHub, then clone your fork
   git clone https://github.com/your-username/mbira-hub.git
   cd mbira-hub
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment**
   ```bash
   cp env.example .env
   # Edit .env with your development settings
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

## 📋 Development Guidelines

### Code Style

**JavaScript/Node.js**
- Use ES6+ features
- Follow async/await pattern
- Use meaningful variable names
- Add JSDoc comments for functions
- Use semicolons consistently

**CSS**
- Use Tailwind CSS classes
- Follow mobile-first responsive design
- Use consistent spacing and colors
- Add comments for complex styles

**HTML**
- Use semantic HTML elements
- Include proper accessibility attributes
- Use consistent indentation (2 spaces)
- Add alt text for images

### Commit Guidelines

Use conventional commit messages:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(audio): add real-time note detection
fix(mobile): resolve touch interaction issues
docs(api): update WebSocket documentation
style(ui): improve mobile responsiveness
```

### Testing

**Before submitting:**
1. Test your changes thoroughly
2. Test on different browsers (Chrome, Firefox, Safari)
3. Test on mobile devices
4. Test audio functionality
5. Check for console errors

**Test Checklist:**
- [ ] Audio detection works
- [ ] Mobile layout is responsive
- [ ] All buttons are functional
- [ ] No console errors
- [ ] Performance is acceptable

## 🐛 Reporting Issues

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the troubleshooting guide** for solutions
3. **Test in different browsers** to isolate the issue

### Issue Template

Use this template when creating issues:

```markdown
**Bug Report**

**Description**
A clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Screenshots**
If applicable, add screenshots.

**Environment**
- OS: [e.g. Windows 10, macOS 12, Ubuntu 20.04]
- Browser: [e.g. Chrome 95, Firefox 94, Safari 15]
- Version: [e.g. 1.0.0]

**Additional Context**
Any other context about the problem.
```

## ✨ Feature Requests

### Feature Request Template

```markdown
**Feature Request**

**Is your feature request related to a problem?**
A clear description of what the problem is.

**Describe the solution you'd like**
A clear description of what you want to happen.

**Describe alternatives you've considered**
A clear description of any alternative solutions.

**Additional context**
Add any other context or screenshots about the feature request.
```

## 🔧 Pull Request Process

### Before Submitting

1. **Update Documentation**
   - Update README.md if needed
   - Update API documentation
   - Add comments to your code

2. **Test Your Changes**
   - Run the application locally
   - Test all affected functionality
   - Check for regressions

3. **Update Tests**
   - Add tests for new features
   - Update existing tests if needed
   - Ensure all tests pass

### Pull Request Template

```markdown
**Pull Request**

**Description**
Brief description of changes.

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

**Testing**
- [ ] Tested locally
- [ ] Tested on mobile
- [ ] Tested audio functionality
- [ ] No console errors

**Screenshots**
If applicable, add screenshots.

**Checklist**
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
```

### Review Process

1. **Automated Checks**
   - Code style validation
   - Build verification
   - Test execution

2. **Manual Review**
   - Code quality review
   - Functionality testing
   - Documentation review

3. **Approval**
   - Maintainer approval required
   - Address any feedback
   - Merge to main branch

## 🎨 UI/UX Contributions

### Design Principles

- **Mobile-First**: Design for mobile, enhance for desktop
- **Accessibility**: Ensure usability for all users
- **Consistency**: Follow established design patterns
- **Performance**: Optimize for speed and responsiveness

### UI Guidelines

**Colors**
- Primary: Blue (#3B82F6)
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Error: Red (#EF4444)
- Background: Slate (#F8FAFC)

**Typography**
- Headings: Font weight 700-900
- Body: Font weight 400-500
- Mobile: Minimum 16px font size

**Spacing**
- Use Tailwind spacing scale
- Consistent padding and margins
- Touch targets minimum 44px

## 📚 Documentation Contributions

### Documentation Types

- **User Guides**: Step-by-step instructions
- **API Documentation**: Endpoint descriptions
- **Developer Guides**: Setup and development
- **Troubleshooting**: Common issues and solutions

### Writing Guidelines

- **Clear and Concise**: Use simple language
- **Step-by-Step**: Break down complex processes
- **Examples**: Include code examples
- **Screenshots**: Add visual aids when helpful

## 🌐 Translation Contributions

### Supported Languages

Currently supported:
- English (en) - Default
- Spanish (es) - Partial
- French (fr) - Partial

### Adding New Languages

1. **Create language file**
   ```bash
   # Create new language directory
   mkdir -p static/locales/your-language
   
   # Copy English file as template
   cp static/locales/en/strings.json static/locales/your-language/strings.json
   ```

2. **Translate strings**
   - Translate all user-facing strings
   - Keep technical terms consistent
   - Test with different text lengths

3. **Update language selector**
   - Add language option to UI
   - Update language detection logic

## 🧪 Testing Contributions

### Test Types

- **Unit Tests**: Individual function testing
- **Integration Tests**: Component interaction testing
- **E2E Tests**: End-to-end user flow testing
- **Performance Tests**: Load and stress testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e

# Run tests with coverage
npm run test:coverage
```

## 📞 Getting Help

### Community Channels

- **GitHub Discussions**: General questions and discussions
- **GitHub Issues**: Bug reports and feature requests
- **Discord**: Real-time chat (if available)

### Development Resources

- **API Documentation**: [API Documentation](API-Documentation)
- **Deployment Guide**: [Deployment Guide](Deployment)
- **Troubleshooting**: [Troubleshooting Guide](Troubleshooting)

## 📄 License

By contributing to Mbira Hub, you agree that your contributions will be licensed under the same MIT License that covers the project.

## 🙏 Recognition

Contributors will be recognized in:
- **README.md**: Contributor list
- **Release Notes**: Feature and fix acknowledgments
- **GitHub**: Contributor statistics

---

**Ready to contribute?** Start by forking the repository and creating your first pull request! 🚀
