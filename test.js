import test from 'ava'
import pdfTemplate from './'

test('pdf-template example', t => {
  t.plan(1)
  return pdfTemplate({
    template: './example.pdf',
    output: './output.pdf',
    data: {
      name: 'John Doe',
      age: 26,
      email: 'johndoe@example.com',
      birthdate: '01/01/1990',
      projects: ['project1', 'project2', 'project3']
    }
  }).then((res) => {
    t.pass()
  }).catch((err) => {
    t.fail()
  })
})

test('pdf-template fail example', t => {
  t.plan(1)
  return pdfTemplate({
    template: './exampleFail.pdf',
    output: './output.pdf',
    data: {
      name: 'John Doe',
      age: 26,
      email: 'johndoe@example.com',
      birthdate: '01/01/1990',
      projects: ['project1', 'project2', 'project3']
    }
  }).then((res) => {
    t.fail()
  }).catch((err) => {
    t.pass()
  })
})
